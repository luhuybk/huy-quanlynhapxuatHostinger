import { prisma } from "@/lib/prisma";
import { buildTransactionWhere, type Viewer } from "@/lib/get-transactions";

// Số việc đang chờ cho trang Tổng quan. Mọi con số đều đếm bằng đúng bộ lọc
// của trang danh sách tương ứng (cùng buildTransactionWhere), nên bấm vào số
// nào là ra đúng chừng ấy dòng — kể cả phạm vi đại lý riêng của nhân viên.
export async function getDashboard(viewer?: Viewer) {
  const importWhere = (f: Parameters<typeof buildTransactionWhere>[1]) =>
    buildTransactionWhere("IMPORT", f, viewer);
  const exportWhere = (f: Parameters<typeof buildTransactionWhere>[1]) =>
    buildTransactionWhere("EXPORT", f, viewer);

  const [
    vnPending,
    vnWaiting,
    chinaPending,
    chinaWaiting,
    importNotReceived,
    importUnpaid,
    exportNotShipped,
    exportUnpaid,
    exportUnsettled,
    vnPendingOrders,
    unpaidByAgent,
    unpaidBySupplier,
  ] = await Promise.all([
    prisma.vnOrder.count({ where: { ordered: false } }),
    prisma.vnOrder.count({ where: { ordered: true, arrived: false } }),
    prisma.chinaOrderItem.count({ where: { ordered: false } }),
    prisma.chinaOrderItem.count({ where: { ordered: true, arrived: false } }),
    prisma.transaction.count({ where: importWhere({ receivedWarehouse: "0" }) }),
    prisma.transaction.count({ where: importWhere({ paidDebt: "0" }) }),
    prisma.transaction.count({ where: exportWhere({ goodsShipped: "0" }) }),
    prisma.transaction.count({ where: exportWhere({ paid: "0" }) }),
    prisma.transaction.count({ where: exportWhere({ settled: "0" }) }),
    prisma.vnOrder.findMany({
      where: { ordered: false },
      select: { brand: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    }),
    prisma.transaction.groupBy({
      by: ["agentId"],
      where: exportWhere({ paid: "0" }),
      _count: true,
    }),
    prisma.transaction.groupBy({
      by: ["supplierId"],
      where: importWhere({ paidDebt: "0" }),
      _count: true,
    }),
  ]);

  // Order chờ gửi hãng, gom theo brand: nhiều đợt nhỏ cùng brand gửi một lần.
  const byBrand = new Map<string, { id: string; name: string; orders: number; items: number }>();
  for (const o of vnPendingOrders) {
    const row = byBrand.get(o.brand.id) ?? { ...o.brand, orders: 0, items: 0 };
    row.orders += 1;
    row.items += o._count.items;
    byBrand.set(o.brand.id, row);
  }

  const [agents, suppliers] = await Promise.all([
    prisma.agent.findMany({
      where: { id: { in: unpaidByAgent.flatMap((r) => (r.agentId ? [r.agentId] : [])) } },
      select: { id: true, name: true },
    }),
    prisma.supplier.findMany({
      where: { id: { in: unpaidBySupplier.flatMap((r) => (r.supplierId ? [r.supplierId] : [])) } },
      select: { id: true, name: true },
    }),
  ]);
  const named = (
    rows: { id: string | null; count: number }[],
    names: { id: string; name: string }[]
  ) =>
    rows
      .flatMap((r) => {
        const n = names.find((x) => x.id === r.id);
        return n ? [{ ...n, count: r.count }] : [];
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));

  return {
    order: { vnPending, vnWaiting, chinaPending, chinaWaiting },
    imports: { notReceived: importNotReceived, unpaid: importUnpaid },
    exports: { notShipped: exportNotShipped, unpaid: exportUnpaid, unsettled: exportUnsettled },
    pendingBrands: [...byBrand.values()].sort(
      (a, b) => b.items - a.items || a.name.localeCompare(b.name, "vi")
    ),
    unpaidAgents: named(
      unpaidByAgent.map((r) => ({ id: r.agentId, count: r._count })),
      agents
    ),
    unpaidSuppliers: named(
      unpaidBySupplier.map((r) => ({ id: r.supplierId, count: r._count })),
      suppliers
    ),
  };
}
