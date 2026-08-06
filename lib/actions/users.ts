"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ Admin mới có quyền quản lý người dùng");
  }
  return session;
}

export async function createUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "SHARED");

  if (!email) throw new Error("Vui lòng nhập email");
  if (!name) throw new Error("Vui lòng nhập tên");
  if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự");
  if (role !== "ADMIN" && role !== "SHARED") throw new Error("Vai trò không hợp lệ");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("Email đã được sử dụng");

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name, passwordHash, role } });
  revalidatePath("/cai-dat");
}

export async function updateUser(id: string, formData: FormData) {
  const session = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "SHARED");
  const password = String(formData.get("password") ?? "");

  if (!name) throw new Error("Vui lòng nhập tên");
  if (role !== "ADMIN" && role !== "SHARED") throw new Error("Vai trò không hợp lệ");
  if (id === session.user.id && role !== "ADMIN") {
    throw new Error("Không thể tự hạ quyền tài khoản của chính mình");
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
    },
  });
  revalidatePath("/cai-dat");
}

export async function deleteUser(id: string) {
  const session = await requireAdmin();

  if (id === session.user.id) {
    throw new Error("Không thể tự xoá tài khoản của chính mình");
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/cai-dat");
}
