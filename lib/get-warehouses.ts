import { prisma } from "@/lib/prisma";

export async function getWarehouses() {
  return prisma.warehouse.findMany({
    orderBy: { sortOrder: "asc" },
    include: { zones: { orderBy: { sortOrder: "asc" } } },
  });
}

export type WarehouseWithZones = Awaited<ReturnType<typeof getWarehouses>>[number];

export async function getSkusWithZone() {
  return prisma.sku.findMany({
    orderBy: [{ brand: { name: "asc" } }, { sortOrder: "asc" }],
    include: {
      brand: { select: { name: true } },
      zone: { select: { id: true, code: true, name: true, color: true, warehouseId: true } },
    },
  });
}

export type SkuWithZone = Awaited<ReturnType<typeof getSkusWithZone>>[number];

// Tồn kho suy ra từ phiếu: tổng nhập trừ tổng xuất, tính theo đơn vị lẻ.
// Không có bảng tồn kho riêng nên con số này luôn khớp với phiếu, không bao
// giờ lệch vì quên cập nhật.
export async function getStockBySku(): Promise<Record<string, number>> {
  const [imported, exported] = await Promise.all([
    prisma.transactionItem.groupBy({
      by: ["skuId"],
      where: { transaction: { type: "IMPORT" } },
      _sum: { quantityUnits: true },
    }),
    prisma.transactionItem.groupBy({
      by: ["skuId"],
      where: { transaction: { type: "EXPORT" } },
      _sum: { quantityUnits: true },
    }),
  ]);

  const stock: Record<string, number> = {};
  for (const row of imported) stock[row.skuId] = row._sum.quantityUnits ?? 0;
  for (const row of exported) {
    stock[row.skuId] = (stock[row.skuId] ?? 0) - (row._sum.quantityUnits ?? 0);
  }
  return stock;
}
