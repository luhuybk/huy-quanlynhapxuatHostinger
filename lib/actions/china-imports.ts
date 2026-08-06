"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { generateChinaImportCode } from "@/lib/codegen";

export type ChinaImportItemInput = {
  itemName: string;
  quantity: number;
  note?: string;
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

function parseItems(itemsRaw: string): ChinaImportItemInput[] {
  let items: ChinaImportItemInput[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    throw new Error("Dữ liệu hàng hoá không hợp lệ");
  }
  if (!items.length) throw new Error("Vui lòng thêm ít nhất 1 mặt hàng");
  return items;
}

export async function createChinaImport(formData: FormData) {
  const session = await requireSession();

  const date = new Date(String(formData.get("date")));
  const note = String(formData.get("note") ?? "").trim() || null;
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  const code = await generateChinaImportCode(date);

  await prisma.$transaction(async (tx) => {
    const chinaImport = await tx.chinaImport.create({
      data: {
        code,
        date,
        note,
        createdById: session.user.id,
      },
    });

    for (const item of items) {
      const itemName = item.itemName?.trim();
      if (!itemName) throw new Error("Vui lòng nhập tên hàng cho tất cả các dòng");
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Số lượng không hợp lệ cho "${itemName}"`);
      }

      await tx.chinaImportItem.create({
        data: {
          chinaImportId: chinaImport.id,
          itemName,
          quantity: item.quantity,
          note: item.note?.trim() || null,
        },
      });
    }
  });

  revalidatePath("/nhap-hang-trung");
}

export async function updateChinaImport(id: string, formData: FormData) {
  const session = await requireSession();
  requireAdmin(session);

  const date = new Date(String(formData.get("date")));
  const note = String(formData.get("note") ?? "").trim() || null;
  const items = parseItems(String(formData.get("items") ?? "[]"));

  if (Number.isNaN(date.getTime())) throw new Error("Ngày không hợp lệ");

  await prisma.$transaction(async (tx) => {
    await tx.chinaImport.update({ where: { id }, data: { date, note } });
    await tx.chinaImportItem.deleteMany({ where: { chinaImportId: id } });

    for (const item of items) {
      const itemName = item.itemName?.trim();
      if (!itemName) throw new Error("Vui lòng nhập tên hàng cho tất cả các dòng");
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Số lượng không hợp lệ cho "${itemName}"`);
      }

      await tx.chinaImportItem.create({
        data: {
          chinaImportId: id,
          itemName,
          quantity: item.quantity,
          note: item.note?.trim() || null,
        },
      });
    }
  });

  revalidatePath("/nhap-hang-trung");
}

export async function deleteChinaImport(id: string) {
  const session = await requireSession();
  requireAdmin(session);

  await prisma.chinaImport.delete({ where: { id } });
  revalidatePath("/nhap-hang-trung");
}
