export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { getSkusWithZone, getStockBySku, getWarehouses } from "@/lib/get-warehouses";
import { WarehouseBoard } from "@/components/warehouse/warehouse-board";

export default async function WarehouseMapPage() {
  const session = await auth();
  // STAFF xem sơ đồ và dời hàng được, chỉ không tự thêm/xoá kho hay khu —
  // xem requireLayoutEditor trong lib/actions/warehouse.ts.
  const canEdit = session?.user.role !== "STAFF";

  const [warehouses, skus, stock] = await Promise.all([
    getWarehouses(),
    getSkusWithZone(),
    getStockBySku(),
  ]);

  const skuOptions = skus.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    size: s.size,
    unitsPerCase: s.unitsPerCase,
    brand: { name: s.brand.name },
    zone: s.zone
      ? {
          id: s.zone.id,
          code: s.zone.code,
          color: s.zone.color,
          warehouseId: s.zone.warehouseId,
        }
      : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Sơ đồ kho</h1>
      <WarehouseBoard
        warehouses={warehouses}
        skus={skuOptions}
        stock={stock}
        canEdit={canEdit}
      />
    </div>
  );
}
