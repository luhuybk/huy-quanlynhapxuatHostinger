import { prisma } from "@/lib/prisma";

export async function getChinaOrderItems() {
  return prisma.chinaOrderItem.findMany({
    // Khi bật "hiện mục đã về", các mục đó nằm cuối danh sách.
    orderBy: [{ arrived: "asc" }, { ordered: "asc" }, { createdAt: "desc" }],
    include: {
      createdBy: { select: { name: true } },
    },
  });
}
