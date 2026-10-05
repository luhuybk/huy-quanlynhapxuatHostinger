export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSkusWithZone, getWarehouses } from "@/lib/get-warehouses";
import { LabelSheet } from "@/components/warehouse/label-sheet";

export default async function LabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ kho?: string }>;
}) {
  const { kho } = await searchParams;
  const [warehouses, skus] = await Promise.all([getWarehouses(), getSkusWithZone()]);
  const warehouse = warehouses.find((w) => w.id === kho) ?? warehouses[0];

  if (!warehouse) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold">In nhãn</h1>
        <p className="text-sm text-muted-foreground">Chưa có kho nào.</p>
        <Button variant="outline" asChild>
          <Link href="/so-do-kho">
            <ArrowLeft className="h-4 w-4" /> Về sơ đồ kho
          </Link>
        </Button>
      </div>
    );
  }

  const zoneIds = new Set(warehouse.zones.map((z) => z.id));
  const skuOptions = skus
    .filter((s) => s.zone && zoneIds.has(s.zone.id))
    .map((s) => ({
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-semibold">Nhãn dán — {warehouse.name}</h1>
        <Button variant="outline" asChild>
          <Link href="/so-do-kho">
            <ArrowLeft className="h-4 w-4" /> Về sơ đồ kho
          </Link>
        </Button>
      </div>
      <LabelSheet
        warehouseName={warehouse.name}
        zones={warehouse.zones}
        skus={skuOptions}
      />
    </div>
  );
}
