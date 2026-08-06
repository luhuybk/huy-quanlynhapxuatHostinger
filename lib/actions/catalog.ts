"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateSkuCode } from "@/lib/codegen";
import { auth } from "@/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

// --- Supplier ---

export async function createSupplier(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên nhà cung cấp không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.supplier.create({ data: { name, note } });
  revalidatePath("/cai-dat");
}

export async function updateSupplier(id: string, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên nhà cung cấp không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.supplier.update({ where: { id }, data: { name, note } });
  revalidatePath("/cai-dat");
}

export async function deleteSupplier(id: string) {
  await requireAuth();
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/cai-dat");
}

// --- Agent (đại lý) ---

export async function createAgent(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên đại lý không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.agent.create({ data: { name, note } });
  revalidatePath("/cai-dat");
}

export async function updateAgent(id: string, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên đại lý không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.agent.update({ where: { id }, data: { name, note } });
  revalidatePath("/cai-dat");
}

export async function deleteAgent(id: string) {
  await requireAuth();
  await prisma.agent.delete({ where: { id } });
  revalidatePath("/cai-dat");
}

// --- Brand ---

export async function createBrand(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên brand không được để trống");

  await prisma.brand.create({ data: { name } });
  revalidatePath("/cai-dat");
}

export async function updateBrand(id: string, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên brand không được để trống");

  await prisma.brand.update({ where: { id }, data: { name } });
  revalidatePath("/cai-dat");
}

export async function deleteBrand(id: string) {
  await requireAuth();
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/cai-dat");
}

// --- Sku ---

export async function createSku(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "");
  const unitsPerCase = Number(formData.get("unitsPerCase") ?? 1);
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const isQuickCreate = formData.get("isQuickCreate") === "on";
  let code = String(formData.get("code") ?? "").trim();

  if (!name) throw new Error("Tên sản phẩm không được để trống");
  if (!brandId) throw new Error("Vui lòng chọn brand");
  if (!unitsPerCase || unitsPerCase < 1) {
    throw new Error("Số lượng lẻ/thùng phải lớn hơn 0");
  }

  if (!code) {
    const brand = await prisma.brand.findUniqueOrThrow({
      where: { id: brandId },
    });
    code = await generateSkuCode(brand.name);
  }

  await prisma.sku.create({
    data: {
      code,
      name,
      brandId,
      unitsPerCase,
      supplierId,
      isQuickCreate,
    },
  });
  revalidatePath("/cai-dat");
  revalidatePath("/nhap-hang");
  revalidatePath("/xuat-hang");
}

export async function updateSku(id: string, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "");
  const unitsPerCase = Number(formData.get("unitsPerCase") ?? 1);
  const supplierId = String(formData.get("supplierId") ?? "") || null;
  const isQuickCreate = formData.get("isQuickCreate") === "on";

  if (!name) throw new Error("Tên sản phẩm không được để trống");
  if (!brandId) throw new Error("Vui lòng chọn brand");
  if (!unitsPerCase || unitsPerCase < 1) {
    throw new Error("Số lượng lẻ/thùng phải lớn hơn 0");
  }

  await prisma.sku.update({
    where: { id },
    data: { name, brandId, unitsPerCase, supplierId, isQuickCreate },
  });
  revalidatePath("/cai-dat");
  revalidatePath("/nhap-hang");
  revalidatePath("/xuat-hang");
}

export async function deleteSku(id: string) {
  await requireAuth();
  await prisma.sku.delete({ where: { id } });
  revalidatePath("/cai-dat");
  revalidatePath("/nhap-hang");
  revalidatePath("/xuat-hang");
}

export async function findOrCreateSkuByName(
  name: string,
  brandId: string
): Promise<{ id: string; code: string; unitsPerCase: number }> {
  await requireAuth();
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Tên sản phẩm không được để trống");

  const existing = await prisma.sku.findFirst({
    where: { name: trimmedName, brandId },
  });
  if (existing) return existing;

  const brand = await prisma.brand.findUniqueOrThrow({
    where: { id: brandId },
  });
  const code = await generateSkuCode(brand.name);

  const created = await prisma.sku.create({
    data: { code, name: trimmedName, brandId, unitsPerCase: 1 },
  });
  revalidatePath("/cai-dat");
  return created;
}
