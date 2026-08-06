import { prisma } from "@/lib/prisma";

export async function getChinaOrderItems() {
  return prisma.chinaOrderItem.findMany({
    orderBy: [{ ordered: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
    },
  });
}
