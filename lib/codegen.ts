import { prisma } from "@/lib/prisma";

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

export async function generateSkuCode(brandName: string): Promise<string> {
  const brandPrefix = brandName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);

  const countExisting = await prisma.sku.count({
    where: { code: { startsWith: `${brandPrefix}-` } },
  });

  const seq = pad(countExisting + 1, 4);
  return `${brandPrefix}-${seq}`;
}
