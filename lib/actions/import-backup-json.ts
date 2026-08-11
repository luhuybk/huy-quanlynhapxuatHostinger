"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type ImportJsonSummary = {
  users: number;
  brands: number;
  suppliers: number;
  agents: number;
  skus: number;
  transactions: number;
  chinaImports: number;
  chinaOrderItems: number;
  warnings: string[];
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ Admin mới có quyền nhập dữ liệu backup");
  }
  return session;
}

function toDate(v: unknown): Date {
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// Backup JSON đầy đủ (từ /api/backup-json) giữ nguyên id gốc + mật khẩu đã
// hash + toàn bộ liên kết (kể cả Agent.ownerId) -> khôi phục bằng cách
// upsert theo đúng id, không cần dò tên như file Excel.
export async function importBackupJson(formData: FormData): Promise<ImportJsonSummary> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Vui lòng chọn file backup (.json)");
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("File JSON không hợp lệ");
  }
  if (data.format !== "waxshop-full-backup") {
    throw new Error('File không đúng định dạng backup JSON ("Xuất backup đầy đủ")');
  }

  const summary: ImportJsonSummary = {
    users: 0,
    brands: 0,
    suppliers: 0,
    agents: 0,
    skus: 0,
    transactions: 0,
    chinaImports: 0,
    chinaOrderItems: 0,
    warnings: [],
  };

  const arr = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : [];

  for (const u of arr("users")) {
    try {
      const { id, email, name, passwordHash, role, createdAt } = u as {
        id: string; email: string; name: string; passwordHash: string; role: string; createdAt: string;
      };
      await prisma.user.upsert({
        where: { id },
        create: { id, email, name, passwordHash, role, createdAt: toDate(createdAt) },
        update: { email, name, passwordHash, role },
      });
      summary.users++;
    } catch (e) {
      summary.warnings.push(`User "${u.email}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const b of arr("brands")) {
    try {
      const { id, name, sortOrder, createdAt } = b as {
        id: string; name: string; sortOrder: number; createdAt: string;
      };
      await prisma.brand.upsert({
        where: { id },
        create: { id, name, sortOrder, createdAt: toDate(createdAt) },
        update: { name, sortOrder },
      });
      summary.brands++;
    } catch (e) {
      summary.warnings.push(`Brand "${b.name}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const s of arr("suppliers")) {
    try {
      const { id, name, note, sortOrder, createdAt } = s as {
        id: string; name: string; note: string | null; sortOrder: number; createdAt: string;
      };
      await prisma.supplier.upsert({
        where: { id },
        create: { id, name, note, sortOrder, createdAt: toDate(createdAt) },
        update: { name, note, sortOrder },
      });
      summary.suppliers++;
    } catch (e) {
      summary.warnings.push(`Đối tác "${s.name}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const a of arr("agents")) {
    try {
      const { id, name, note, sortOrder, ownerId, createdAt } = a as {
        id: string; name: string; note: string | null; sortOrder: number;
        ownerId: string | null; createdAt: string;
      };
      await prisma.agent.upsert({
        where: { id },
        create: { id, name, note, sortOrder, ownerId, createdAt: toDate(createdAt) },
        update: { name, note, sortOrder, ownerId },
      });
      summary.agents++;
    } catch (e) {
      summary.warnings.push(`Đại lý "${a.name}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const s of arr("skus")) {
    try {
      const { id, code, name, brandId, unitsPerCase, supplierId, isQuickCreate, sortOrder, createdAt } =
        s as {
          id: string; code: string; name: string; brandId: string; unitsPerCase: number;
          supplierId: string | null; isQuickCreate: boolean; sortOrder: number; createdAt: string;
        };
      await prisma.sku.upsert({
        where: { id },
        create: {
          id, code, name, brandId, unitsPerCase, supplierId, isQuickCreate, sortOrder,
          createdAt: toDate(createdAt),
        },
        update: { code, name, brandId, unitsPerCase, supplierId, isQuickCreate, sortOrder },
      });
      summary.skus++;
    } catch (e) {
      summary.warnings.push(`SKU "${s.code}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const t of arr("transactions")) {
    try {
      const {
        id, code, type, date, supplierId, agentId, note, createdById, createdAt,
        paidDebt, receivedWarehouse, goodsShipped, paid, settled, items,
      } = t as {
        id: string; code: string; type: string; date: string; supplierId: string | null;
        agentId: string | null; note: string | null; createdById: string; createdAt: string;
        paidDebt: boolean; receivedWarehouse: boolean; goodsShipped: boolean; paid: boolean;
        settled: boolean; items: Record<string, unknown>[];
      };
      const header = {
        code, type, date: toDate(date), supplierId, agentId, note, createdById,
        paidDebt, receivedWarehouse, goodsShipped, paid, settled,
      };
      await prisma.transaction.upsert({
        where: { id },
        create: { id, ...header, createdAt: toDate(createdAt) },
        update: header,
      });
      for (const it of items ?? []) {
        const {
          id: itemId, skuId, unitType, quantityInput, quantityUnits,
          matchedQuantity, matchedDebt, note: itemNote,
        } = it as {
          id: string; skuId: string; unitType: string; quantityInput: number;
          quantityUnits: number; matchedQuantity: boolean; matchedDebt: boolean; note: string | null;
        };
        await prisma.transactionItem.upsert({
          where: { id: itemId },
          create: {
            id: itemId, transactionId: id, skuId, unitType, quantityInput, quantityUnits,
            matchedQuantity, matchedDebt, note: itemNote,
          },
          update: { skuId, unitType, quantityInput, quantityUnits, matchedQuantity, matchedDebt, note: itemNote },
        });
      }
      summary.transactions++;
    } catch (e) {
      summary.warnings.push(`Phiếu "${t.code}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const ci of arr("chinaImports")) {
    try {
      const { id, code, date, note, createdById, createdAt, items } = ci as {
        id: string; code: string; date: string; note: string | null; createdById: string;
        createdAt: string; items: Record<string, unknown>[];
      };
      await prisma.chinaImport.upsert({
        where: { id },
        create: { id, code, date: toDate(date), note, createdById, createdAt: toDate(createdAt) },
        update: { code, date: toDate(date), note, createdById },
      });
      for (const it of items ?? []) {
        const { id: itemId, itemName, quantity, note: itemNote } = it as {
          id: string; itemName: string; quantity: number; note: string | null;
        };
        await prisma.chinaImportItem.upsert({
          where: { id: itemId },
          create: { id: itemId, chinaImportId: id, itemName, quantity, note: itemNote },
          update: { itemName, quantity, note: itemNote },
        });
      }
      summary.chinaImports++;
    } catch (e) {
      summary.warnings.push(`Phiếu hàng Trung "${ci.code}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  for (const oi of arr("chinaOrderItems")) {
    try {
      const { id, itemName, quantity, note, ordered, arrived, createdById, createdAt } = oi as {
        id: string; itemName: string; quantity: number; note: string | null; ordered: boolean;
        arrived: boolean; createdById: string; createdAt: string;
      };
      await prisma.chinaOrderItem.upsert({
        where: { id },
        create: { id, itemName, quantity, note, ordered, arrived, createdById, createdAt: toDate(createdAt) },
        update: { itemName, quantity, note, ordered, arrived, createdById },
      });
      summary.chinaOrderItems++;
    } catch (e) {
      summary.warnings.push(`Hàng cần order "${oi.itemName}": ${e instanceof Error ? e.message : "lỗi"}`);
    }
  }

  revalidatePath("/cai-dat");
  revalidatePath("/nhap-hang");
  revalidatePath("/xuat-hang");
  revalidatePath("/nhap-hang-trung");

  return summary;
}
