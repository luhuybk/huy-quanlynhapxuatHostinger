"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

function requireAdmin(session: { user: { role: "ADMIN" | "SHARED" | "STAFF" } }) {
  if (session.user.role !== "ADMIN") {
    throw new Error("Tài khoản chung không có quyền thực hiện thao tác này");
  }
}

export async function createChinaOrderItem(formData: FormData) {
  const session = await requireSession();

  const itemName = String(formData.get("itemName") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!itemName) throw new Error("Vui lòng nhập tên hàng");
  if (!quantity || quantity <= 0) throw new Error("Số lượng không hợp lệ");

  await prisma.chinaOrderItem.create({
    data: { itemName, quantity, note, createdById: session.user.id },
  });

  revalidatePath("/hang-can-order");
}

export async function updateChinaOrderItem(id: string, formData: FormData) {
  await requireSession();

  const itemName = String(formData.get("itemName") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!itemName) throw new Error("Vui lòng nhập tên hàng");
  if (!quantity || quantity <= 0) throw new Error("Số lượng không hợp lệ");

  await prisma.chinaOrderItem.update({
    where: { id },
    data: { itemName, quantity, note },
  });

  revalidatePath("/hang-can-order");
}

export async function toggleChinaOrderItem(id: string, ordered: boolean) {
  await requireSession();

  await prisma.chinaOrderItem.update({
    where: { id },
    data: { ordered },
  });

  revalidatePath("/hang-can-order");
}

export async function toggleChinaOrderItemArrived(id: string, arrived: boolean) {
  await requireSession();

  await prisma.chinaOrderItem.update({
    where: { id },
    data: { arrived },
  });

  revalidatePath("/hang-can-order");
}

export async function deleteChinaOrderItem(id: string) {
  const session = await requireSession();
  requireAdmin(session);

  await prisma.chinaOrderItem.delete({ where: { id } });
  revalidatePath("/hang-can-order");
}
