"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Ảnh đã được thu nhỏ ở trình duyệt (lib/resize-image.ts) nên hiếm khi quá
// vài trăm KB; chặn ở đây phòng ai đó gửi thẳng ảnh gốc.
const MAX_BYTES = 900 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function revalidateSkuPages() {
  revalidatePath("/hang-can-order");
  revalidatePath("/cai-dat");
}

export async function setSkuImage(skuId: string, formData: FormData) {
  await requireAuth();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) throw new Error("Chưa chọn ảnh");
  if (!ALLOWED.has(file.type)) throw new Error("Chỉ nhận ảnh JPG, PNG hoặc WebP");
  if (file.size > MAX_BYTES) throw new Error("Ảnh quá lớn, hãy chọn ảnh khác");

  const data = Buffer.from(await file.arrayBuffer());
  const now = new Date();
  await prisma.$transaction([
    prisma.skuImage.upsert({
      where: { skuId },
      create: { skuId, mimeType: file.type, data },
      update: { mimeType: file.type, data },
    }),
    prisma.sku.update({ where: { id: skuId }, data: { imageUpdatedAt: now } }),
  ]);
  revalidateSkuPages();
}

export async function removeSkuImage(skuId: string) {
  await requireAuth();

  await prisma.$transaction([
    prisma.skuImage.deleteMany({ where: { skuId } }),
    prisma.sku.update({ where: { id: skuId }, data: { imageUpdatedAt: null } }),
  ]);
  revalidateSkuPages();
}
