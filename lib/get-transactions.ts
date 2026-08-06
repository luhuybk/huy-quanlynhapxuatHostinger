import { prisma } from "@/lib/prisma";

export async function getTransactions(
  type: "IMPORT" | "EXPORT",
  filters: { from?: string; to?: string; partnerId?: string }
) {
  const where: {
    type: "IMPORT" | "EXPORT";
    date?: { gte?: Date; lte?: Date };
    supplierId?: string;
    agentId?: string;
  } = { type };

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      where.date.lte = to;
    }
  }

  if (filters.partnerId) {
    if (type === "IMPORT") where.supplierId = filters.partnerId;
    else where.agentId = filters.partnerId;
  }

  return prisma.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      supplier: { select: { name: true } },
      agent: { select: { name: true } },
      createdBy: { select: { name: true } },
      items: {
        include: {
          sku: {
            include: { brand: { select: { name: true } } },
          },
        },
      },
    },
  });
}
