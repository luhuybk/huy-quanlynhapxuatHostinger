"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateTransactionCode, generateSkuCode } from "@/lib/codegen";
import { toUnits, type UnitType } from "@/lib/units";

export type TransactionItemInput = {
  skuId: string | null;
  skuName: string;
  brandId: string;
  unitType: UnitType;
  quantityInput: number;
  matchedQuantity: boolean;
  matchedDebt: boolean;
  note?: string;
};

const pathByType: Record<"IMPORT" | "EXPORT", string> = {
  IMPORT: "/nhap-hang",
  EXPORT: "/xuat-hang",
};

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

function requireAdmin(session: { user: { role: "ADMIN" | "SHARED" } }) {
  if (session.user.role !== "ADMIN") {
    throw new Error("Tài khoản chung không có quyền thực hiện thao tác này");
  }
}

function parseItems(itemsRaw: string): TransactionItemInput[] {
  let items: TransactionItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    throw new Error("Dữ liệu sản phẩm không hợp lệ");
  }
  if (!items.length) throw new Error("Vui lòng thêm ít nhất 1 sản phẩm");
  return items;
}

async function resolveSkuId(
  tx: Prisma.TransactionClient,
  item: TransactionItemInput
): Promise<{ skuId: string; unitsPerCase: number }> {
  if (item.skuId) {
    const sku = await tx.sku.findUniqueOrThrow({ where: { id: item.skuId } });
    return { skuId: sku.id, unitsPerCase: sku.unitsPerCase };
  }

  if (!item.brandId) {
    throw new Error(`Vui lòng chọn brand cho "${item.skuName}"`);
  }
  const existing = await tx.sku.findFirst({
    where: { name: item.skuName.trim(), brandId: item.brandId },
  });
  if (existing) return { skuId: existing.id, unitsPerCase: existing.unitsPerCase };

  const brand = await tx.brand.findUniqueOrThrow({ where: { id: item.brandId } });
  const newCode = await generateSkuCode(brand.name);
  const created = await tx.sku.create({
    data: {
      code: newCode,
      name: item.skuName.trim(),
      brandId: item.brandId,
      unitsPerCase: 1,
    },
  });
  return { skuId: created.id, unitsPerCase: 1 };
}

// SHARED accounts may only tick "Khớp SL" on line items; "Khớp CN" (item-level)
// and every header-level status flag stay ADMIN-only.
function sanitizeItemsForRole(
  items: TransactionItemInput[],
  role: "ADMIN" | "SHARED"
): TransactionItemInput[] {
  if (role === "ADMIN") return items;
  return items.map((item) => ({ ...item, matchedDebt: false }));
}

export async function createTransaction(
  type: "IMPORT" | "EXPORT",
  formData: FormData
) {
  const session = await requireSession();
  const role = session.user.role;

  const date = new Date(String(formData.get("date")));
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const agentId = String(formData.get("agentId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const items = sanitizeItemsForRole(
    parseItems(String(formData.get("items") ?? "[]")),
    role
  );

  if (type === "IMPORT" && !supplierId) {
    throw new Error("Vui lòng chọn đối tác");
  }
  if (type === "EXPORT" && !agentId) {
    throw new Error("Vui lòng chọn đại lý");
  }
  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  // Header status flags are ADMIN-only at creation time, except
  // "Đã xuất hàng" (EXPORT) which SHARED accounts may also set.
  const paidDebt = role === "ADMIN" && formData.get("paidDebt") === "on";
  const goodsShipped = formData.get("goodsShipped") === "on";
  const paid = role === "ADMIN" && formData.get("paid") === "on";
  const settled = role === "ADMIN" && formData.get("settled") === "on";

  const code = await generateTransactionCode(type, date);

  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        code,
        type,
        date,
        supplierId: type === "IMPORT" ? supplierId : null,
        agentId: type === "EXPORT" ? agentId : null,
        note,
        createdById: session.user.id,
        paidDebt,
        goodsShipped,
        paid,
        settled,
      },
    });

    for (const item of items) {
      if (!item.quantityInput || item.quantityInput <= 0) {
        throw new Error(`Số lượng không hợp lệ cho "${item.skuName}"`);
      }
      const { skuId, unitsPerCase } = await resolveSkuId(tx, item);
      const quantityUnits = toUnits(item.quantityInput, item.unitType, unitsPerCase);

      await tx.transactionItem.create({
        data: {
          transactionId: transaction.id,
          skuId,
          unitType: item.unitType,
          quantityInput: item.quantityInput,
          quantityUnits,
          matchedQuantity: item.matchedQuantity,
          matchedDebt: item.matchedDebt,
          note: item.note?.trim() || null,
        },
      });
    }
  });

  revalidatePath(pathByType[type]);
}

export async function updateTransaction(
  id: string,
  type: "IMPORT" | "EXPORT",
  formData: FormData
) {
  const session = await requireSession();
  requireAdmin(session);

  const date = new Date(String(formData.get("date")));
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const agentId = String(formData.get("agentId") ?? "") || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (type === "IMPORT" && !supplierId) {
    throw new Error("Vui lòng chọn đối tác");
  }
  if (type === "EXPORT" && !agentId) {
    throw new Error("Vui lòng chọn đại lý");
  }
  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  const paidDebt = formData.get("paidDebt") === "on";
  const goodsShipped = formData.get("goodsShipped") === "on";
  const paid = formData.get("paid") === "on";
  const settled = formData.get("settled") === "on";

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: { id },
      data: {
        date,
        supplierId: type === "IMPORT" ? supplierId : null,
        agentId: type === "EXPORT" ? agentId : null,
        note,
        paidDebt,
        goodsShipped,
        paid,
        settled,
      },
    });

    await tx.transactionItem.deleteMany({ where: { transactionId: id } });

    for (const item of items) {
      if (!item.quantityInput || item.quantityInput <= 0) {
        throw new Error(`Số lượng không hợp lệ cho "${item.skuName}"`);
      }
      const { skuId, unitsPerCase } = await resolveSkuId(tx, item);
      const quantityUnits = toUnits(item.quantityInput, item.unitType, unitsPerCase);

      await tx.transactionItem.create({
        data: {
          transactionId: id,
          skuId,
          unitType: item.unitType,
          quantityInput: item.quantityInput,
          quantityUnits,
          matchedQuantity: item.matchedQuantity,
          matchedDebt: item.matchedDebt,
          note: item.note?.trim() || null,
        },
      });
    }
  });

  revalidatePath(pathByType[type]);
}

export async function updateItemFlags(
  itemId: string,
  type: "IMPORT" | "EXPORT",
  data: { matchedQuantity?: boolean; matchedDebt?: boolean }
) {
  const session = await requireSession();

  if (session.user.role === "SHARED" && "matchedDebt" in data) {
    throw new Error("Tài khoản chung không có quyền tick Khớp công nợ");
  }

  await prisma.transactionItem.update({
    where: { id: itemId },
    data,
  });
  revalidatePath(pathByType[type]);
}

export async function updateTransactionFlags(
  id: string,
  type: "IMPORT" | "EXPORT",
  data: {
    paidDebt?: boolean;
    goodsShipped?: boolean;
    paid?: boolean;
    settled?: boolean;
  }
) {
  const session = await requireSession();

  if (session.user.role === "SHARED") {
    const keys = Object.keys(data);
    const onlyGoodsShipped =
      type === "EXPORT" && keys.every((k) => k === "goodsShipped");
    if (!onlyGoodsShipped) {
      throw new Error(
        "Tài khoản chung chỉ được phép tick 'Đã xuất hàng' bên xuất kho"
      );
    }
  }

  await prisma.transaction.update({ where: { id }, data });
  revalidatePath(pathByType[type]);
}

export async function deleteTransaction(id: string) {
  const session = await requireSession();
  requireAdmin(session);

  const deleted = await prisma.transaction.delete({ where: { id } });
  revalidatePath(pathByType[deleted.type as "IMPORT" | "EXPORT"]);
}
