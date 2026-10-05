"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Printer, SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import { countCellsByZone, parseGrid } from "@/lib/warehouse-layout";
import { deleteWarehouse } from "@/lib/actions/warehouse";
import { PlanGrid } from "@/components/warehouse/plan-grid";
import { PlanEditor } from "@/components/warehouse/plan-editor";
import { ZoneManager } from "@/components/warehouse/zone-manager";
import { ZoneSkuPanel } from "@/components/warehouse/zone-sku-panel";
import { SkuZoneSearch } from "@/components/warehouse/sku-zone-search";
import {
  CreateWarehouseDialog,
  EditWarehouseDialog,
} from "@/components/warehouse/warehouse-dialog";
import type { SkuLite, WarehouseLite } from "@/components/warehouse/types";

export function WarehouseBoard({
  warehouses,
  skus,
  stock,
  canEdit,
}: {
  warehouses: WarehouseLite[];
  skus: SkuLite[];
  stock: Record<string, number>;
  canEdit: boolean;
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(false);
  const [isPending, startTransition] = useTransition();

  const warehouse = warehouses.find((w) => w.id === warehouseId) ?? warehouses[0];

  const grid = useMemo(
    () => (warehouse ? parseGrid(warehouse.layout, warehouse.cols, warehouse.rows) : []),
    [warehouse]
  );
  const cellCounts = useMemo(() => countCellsByZone(grid), [grid]);

  const skuCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of skus) {
      if (s.zone) counts[s.zone.id] = (counts[s.zone.id] ?? 0) + 1;
    }
    return counts;
  }, [skus]);

  const unassigned = useMemo(() => skus.filter((s) => !s.zone), [skus]);
  const selectedZone = warehouse?.zones.find((z) => z.id === zoneId) ?? null;
  const zoneSkus = useMemo(
    () => (zoneId ? skus.filter((s) => s.zone?.id === zoneId) : []),
    [skus, zoneId]
  );

  function handleDeleteWarehouse(id: string) {
    startTransition(async () => {
      try {
        await deleteWarehouse(id);
        toast.success("Đã xoá kho");
        setWarehouseId(warehouses.find((w) => w.id !== id)?.id ?? "");
        setZoneId(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  if (!warehouse) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border p-6">
        <p className="font-medium">Chưa có kho nào</p>
        <p className="text-sm text-muted-foreground">
          Thêm một kho rồi chia khu vực, sau đó gán hàng vào từng khu để tra cho nhanh.
        </p>
        {canEdit ? (
          <CreateWarehouseDialog onCreated={setWarehouseId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nhờ tài khoản Admin tạo kho giúp.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {warehouses.length > 1 ? (
          <Select
            value={warehouse.id}
            onValueChange={(v) => {
              setWarehouseId(v);
              setZoneId(null);
              setEditingPlan(false);
            }}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="font-medium">{warehouse.name}</p>
        )}

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <CreateWarehouseDialog
              onCreated={(id) => {
                setWarehouseId(id);
                setZoneId(null);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => setEditingWarehouse(true)}>
              <Pencil className="h-4 w-4" /> Sửa kho
            </Button>
            <ConfirmDeleteButton
              disabled={isPending}
              label="Xoá kho"
              title="Xoá kho này?"
              description={`Kho ${warehouse.name} và ${warehouse.zones.length} khu vực của nó sẽ bị xoá. Hàng đang ở các khu đó chuyển về "chưa gán khu", không mã nào bị mất.`}
              onConfirm={() => handleDeleteWarehouse(warehouse.id)}
            />
          </div>
        )}
      </div>

      {warehouse.note && (
        <p className="text-sm text-muted-foreground">{warehouse.note}</p>
      )}

      <SkuZoneSearch
        skus={skus}
        onPick={(sku) => {
          if (!sku.zone) {
            setZoneId(null);
            toast.info(`${sku.name} chưa được gán khu`);
            return;
          }
          setEditingPlan(false);
          setWarehouseId(sku.zone.warehouseId);
          setZoneId(sku.zone.id);
        }}
      />

      {editingPlan ? (
        <PlanEditor warehouse={warehouse} onClose={() => setEditingPlan(false)} />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {warehouse.cols} × {warehouse.rows} ô — bấm vào một ô để xem hàng trong khu đó
            </p>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditingPlan(true)}>
                  <SquarePen className="h-4 w-4" /> Sửa sơ đồ
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <Link href={`/so-do-kho/nhan?kho=${warehouse.id}`}>
                  <Printer className="h-4 w-4" /> In nhãn
                </Link>
              </Button>
            </div>
          </div>

          <PlanGrid
            grid={grid}
            zones={warehouse.zones}
            highlightZoneId={zoneId}
            onZoneClick={(id) => setZoneId((cur) => (cur === id ? null : id))}
          />

          <div className="flex flex-wrap gap-2">
            {warehouse.zones.map((z) => {
              const active = z.id === zoneId;
              return (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoneId(active ? null : z.id)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-sm font-medium",
                    zoneColor(z.color).badge,
                    active ? "border-primary ring-2 ring-primary/40" : "border-transparent"
                  )}
                >
                  {z.code}
                  {z.name ? ` · ${z.name}` : ""} ({skuCounts[z.id] ?? 0})
                </button>
              );
            })}
            {unassigned.length > 0 && (
              <button
                type="button"
                onClick={() => setZoneId("__unassigned__")}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-sm font-medium text-muted-foreground",
                  zoneId === "__unassigned__" ? "border-primary ring-2 ring-primary/40" : "border-border"
                )}
              >
                Chưa gán khu ({unassigned.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* key theo khu: đổi khu là dựng lại bảng, nếu không thì danh sách đã tick
          của khu trước còn nằm trong state và nút "Chuyển" sẽ dời nhầm những mã
          không hề hiện trên màn hình. */}
      {zoneId === "__unassigned__" ? (
        <ZoneSkuPanel
          key="unassigned"
          title={`Chưa gán khu (${unassigned.length} mã hàng)`}
          description="Chọn các mã rồi chuyển vào khu tương ứng."
          skus={unassigned}
          warehouses={warehouses}
          stock={stock}
        />
      ) : selectedZone ? (
        <ZoneSkuPanel
          key={selectedZone.id}
          title={`Khu ${selectedZone.code}${selectedZone.name ? ` — ${selectedZone.name}` : ""}`}
          description={`${zoneSkus.length} mã hàng · ${cellCounts[selectedZone.id] ?? 0} ô trên sơ đồ`}
          skus={zoneSkus}
          warehouses={warehouses}
          stock={stock}
        />
      ) : null}

      <ZoneManager
        warehouse={warehouse}
        cellCounts={cellCounts}
        skuCounts={skuCounts}
        canEdit={canEdit}
      />

      <EditWarehouseDialog
        warehouse={warehouse}
        open={editingWarehouse}
        onOpenChange={setEditingWarehouse}
      />
    </div>
  );
}
