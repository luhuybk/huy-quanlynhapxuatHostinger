import { prisma } from "@/lib/prisma";

export async function getChinaImports(filters: { from?: string; to?: string }) {
  const where: { date?: { gte?: Date; lte?: Date } } = {};

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      where.date.lte = to;
    }
  }

  return prisma.chinaImport.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      createdBy: { select: { name: true } },
      items: true,
    },
  });
}
