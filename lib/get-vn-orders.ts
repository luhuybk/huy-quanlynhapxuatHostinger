import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type VnOrderFilters = {
  brandId?: string;
  status?: string;
};

export async function getVnOrders(filters: VnOrderFilters = {}) {
  const where: Prisma.VnOrderWhereInput = {};

  if (filters.brandId) where.brandId = filters.brandId;
  // "Chưa đặt" / "đã đặt chưa về" / "đã về" — mặc định hiện tất cả.
  if (filters.status === "pending") where.ordered = false;
  if (filters.status === "ordered") {
    where.ordered = true;
    where.arrived = false;
  }
  if (filters.status === "arrived") where.arrived = true;

  return prisma.vnOrder.findMany({
    where,
    // Đợt chưa về nổi lên trước, trong đó mới nhất trước.
    orderBy: [{ arrived: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    include: {
      brand: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      items: { orderBy: { itemName: "asc" } },
    },
  });
}
