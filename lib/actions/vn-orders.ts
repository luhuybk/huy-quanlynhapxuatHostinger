"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateVnOrderCode } from "@/lib/codegen";

export type VnOrderItemInput = {
  skuId: string | null;
  itemName: string;
  quantity: number;
  note?: string;
};

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

function requireAdmin(session: { user: { role: "ADMIN" | "SHARED" | "STAFF" } }) {
  if (session.user.role !== "ADMIN") {
    throw new Error("Tài khoản này không có quyền thực hiện thao tác này");
  }
}

function parseItems(itemsRaw: string): VnOrderItemInput[] {
  let items: VnOrderItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    throw new Error("Dữ liệu hàng hoá không hợp lệ");
  }
  if (!items.length) throw new Error("Vui lòng thêm ít nhất 1 mặt hàng");
  return items;
}

// Chuẩn hoá + kiểm tra từng dòng trước khi ghi, dùng chung cho tạo mới và sửa.
function normalizeItems(items: VnOrderItemInput[]) {
  return items.map((item) => {
    const itemName = item.itemName?.trim();
    if (!itemName) throw new Error("Vui lòng nhập tên hàng cho tất cả các dòng");
    if (!item.quantity || item.quantity <= 0) {
      throw new Error(`Số lượng không hợp lệ cho "${itemName}"`);
    }
    return {
      skuId: item.skuId || null,
      itemName,
      quantity: item.quantity,
      note: item.note?.trim() || null,
    };
  });
}

export async function createVnOrder(formData: FormData) {
  const session = await requireSession();

  const date = new Date(String(formData.get("date")));
  const brandId = String(formData.get("brandId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const ordered = formData.get("ordered") === "on";
  const arrived = formData.get("arrived") === "on";
  const items = normalizeItems(parseItems(String(formData.get("items") ?? "[]")));

  if (!brandId) throw new Error("Vui lòng chọn brand");
  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  await prisma.$transaction(async (tx) => {
    // Sinh mã bằng chính client của transaction để 2 đợt tạo cùng lúc không
    // đếm ra cùng một số thứ tự.
    const code = await generateVnOrderCode(date, tx);

    await tx.vnOrder.create({
      data: {
        code,
        date,
        brandId,
        note,
        ordered,
        arrived,
        createdById: session.user.id,
        items: { create: items },
      },
    });
  });

  revalidatePath("/hang-can-order");
}

export async function updateVnOrder(id: string, formData: FormData) {
  await requireSession();

  const date = new Date(String(formData.get("date")));
  const brandId = String(formData.get("brandId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const ordered = formData.get("ordered") === "on";
  const arrived = formData.get("arrived") === "on";
  const items = normalizeItems(parseItems(String(formData.get("items") ?? "[]")));

  if (!brandId) throw new Error("Vui lòng chọn brand");
  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  await prisma.$transaction(async (tx) => {
    await tx.vnOrder.update({
      where: { id },
      data: { date, brandId, note, ordered, arrived },
    });
    await tx.vnOrderItem.deleteMany({ where: { vnOrderId: id } });
    await tx.vnOrderItem.createMany({
      data: items.map((item) => ({ ...item, vnOrderId: id })),
    });
  });

  revalidatePath("/hang-can-order");
}

export async function updateVnOrderFlags(
  id: string,
  data: { ordered?: boolean; arrived?: boolean }
) {
  await requireSession();

  await prisma.vnOrder.update({ where: { id }, data });
  revalidatePath("/hang-can-order");
}

export async function deleteVnOrder(id: string) {
  const session = await requireSession();
  requireAdmin(session);

  await prisma.vnOrder.delete({ where: { id } });
  revalidatePath("/hang-can-order");
}
