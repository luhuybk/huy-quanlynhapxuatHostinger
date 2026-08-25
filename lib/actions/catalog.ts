"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateSkuCode } from "@/lib/codegen";
import { nextSortOrder } from "@/lib/sort-order";
import { auth } from "@/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// --- Supplier ---

export async function createSupplier(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên nhà cung cấp không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.supplier.create({
    data: { name, note, sortOrder: await nextSortOrder("supplier") },
  });
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

export async function reorderSuppliers(orderedIds: string[]) {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.supplier.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
}

// --- Agent (đại lý) ---
//
// ownerId scopes visibility: null = shared (chung), visible to everyone.
// A STAFF-owned agent (and its EXPORT transactions) is only visible to that
// staff member — see the ownerId filters in app/(app)/{cai-dat,xuat-hang}/page.tsx.
// Only ADMIN can assign/reassign an owner; STAFF always creates/owns agents
// as themselves; SHARED creates shared (ownerId null) agents.

// The owner <Select> submits "none" for "Chung" since Radix Select can't use
// an empty string as an item value.
function parseOwnerId(formData: FormData): string | null {
  const raw = String(formData.get("ownerId") ?? "").trim();
  return raw && raw !== "none" ? raw : null;
}

export async function createAgent(formData: FormData) {
  const session = await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên đại lý không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  let ownerId: string | null = null;
  if (session.user.role === "STAFF") {
    ownerId = session.user.id;
  } else if (session.user.role === "ADMIN") {
    ownerId = parseOwnerId(formData);
  }

  await prisma.agent.create({
    data: { name, note, ownerId, sortOrder: await nextSortOrder("agent") },
  });
  revalidatePath("/cai-dat");
  revalidatePath("/xuat-hang");
}

export async function updateAgent(id: string, formData: FormData) {
  const session = await requireAuth();
  const existing = await prisma.agent.findUniqueOrThrow({ where: { id } });
  if (session.user.role === "STAFF" && existing.ownerId !== session.user.id) {
    throw new Error("Bạn không có quyền sửa đại lý này");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên đại lý không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  const data: { name: string; note: string | null; ownerId?: string | null } = { name, note };
  if (session.user.role === "ADMIN" && formData.has("ownerId")) {
    data.ownerId = parseOwnerId(formData);
  }

  await prisma.agent.update({ where: { id }, data });
  revalidatePath("/cai-dat");
  revalidatePath("/xuat-hang");
}

export async function deleteAgent(id: string) {
  const session = await requireAuth();
  if (session.user.role === "STAFF") {
    const existing = await prisma.agent.findUniqueOrThrow({ where: { id } });
    if (existing.ownerId !== session.user.id) {
      throw new Error("Bạn không có quyền xoá đại lý này");
    }
  }
  await prisma.agent.delete({ where: { id } });
  revalidatePath("/cai-dat");
  revalidatePath("/xuat-hang");
}

export async function reorderAgents(orderedIds: string[]) {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.agent.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/cai-dat");
  revalidatePath("/xuat-hang");
}

// --- Brand ---

export async function createBrand(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên brand không được để trống");

  await prisma.brand.create({
    data: { name, sortOrder: await nextSortOrder("brand") },
  });
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

export async function reorderBrands(orderedIds: string[]) {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.brand.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
  revalidatePath("/xuat-hang");
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
      sortOrder: await nextSortOrder("sku"),
    },
  });
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
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
  revalidatePath("/hang-ve-kho");
  revalidatePath("/xuat-hang");
}

export async function deleteSku(id: string) {
  await requireAuth();
  await prisma.sku.delete({ where: { id } });
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
  revalidatePath("/xuat-hang");
}

export async function reorderSkus(orderedIds: string[]) {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.sku.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
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
    data: { code, name: trimmedName, brandId, unitsPerCase: 1, sortOrder: await nextSortOrder("sku") },
  });
  revalidatePath("/cai-dat");
  return created;
}
