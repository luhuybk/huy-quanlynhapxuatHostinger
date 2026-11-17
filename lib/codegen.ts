import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Client = typeof prisma | Prisma.TransactionClient;

function pad(n: number, len: number) {
  return n.toString().padStart(len, "0");
}

export async function generateTransactionCode(
  type: "IMPORT" | "EXPORT",
  date: Date
): Promise<string> {
  const prefix = type === "IMPORT" ? "NH" : "XU";
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  const dayStart = new Date(y, date.getMonth(), date.getDate());
  const dayEnd = new Date(y, date.getMonth(), date.getDate() + 1);

  const countToday = await prisma.transaction.count({
    where: {
      type,
      date: { gte: dayStart, lt: dayEnd },
    },
  });

  const seq = pad(countToday + 1, 2);
  return `${prefix}-${y}${m}${d}-${seq}`;
}

export async function generateChinaImportCode(date: Date): Promise<string> {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  const dayStart = new Date(y, date.getMonth(), date.getDate());
  const dayEnd = new Date(y, date.getMonth(), date.getDate() + 1);

  const countToday = await prisma.chinaImport.count({
    where: { date: { gte: dayStart, lt: dayEnd } },
  });

  const seq = pad(countToday + 1, 2);
  return `TQ-${y}${m}${d}-${seq}`;
}

export async function generateVnOrderCode(
  date: Date,
  client: Client = prisma
): Promise<string> {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  const dayStart = new Date(y, date.getMonth(), date.getDate());
  const dayEnd = new Date(y, date.getMonth(), date.getDate() + 1);

  const countToday = await client.vnOrder.count({
    where: { date: { gte: dayStart, lt: dayEnd } },
  });

  const seq = pad(countToday + 1, 2);
  return `VN-${y}${m}${d}-${seq}`;
}

export async function generateSkuCode(
  brandName: string,
  client: Client = prisma
): Promise<string> {
  const brandPrefix = brandName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  // Lấy số lớn nhất đang có + 1, không đếm số mã: gộp/xoá mã để lại chỗ trống
  // (CINP còn 20 mã nhưng đã lên tới 0026), đếm thì ra mã trùng mã cũ.
  const existing = await client.sku.findMany({
    where: { code: { startsWith: `${brandPrefix}-` } },
    select: { code: true },
  });
  const maxSeq = existing.reduce((max, { code }) => {
    const n = Number(code.slice(brandPrefix.length + 1));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);

  const seq = pad(maxSeq + 1, 4);
  return `${brandPrefix}-${seq}`;
}
