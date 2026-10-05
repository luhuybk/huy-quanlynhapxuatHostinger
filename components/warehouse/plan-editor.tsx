"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import {
  AISLE,
  MAX_SIDE,
  MIN_SIDE,
  clampSide,
  countCellsByZone,
  parseGrid,
  resizeGrid,
  setCell,
  type LayoutCell,
  type LayoutGrid,
} from "@/lib/warehouse-layout";
import { saveWarehousePlan } from "@/lib/actions/warehouse";
import { AISLE_CLASS, PlanGrid } from "@/components/warehouse/plan-grid";
import type { WarehouseLite } from "@/components/warehouse/types";

// Chế độ vẽ: chọn bút (một khu / lối đi / ngoài kho) rồi quét lên lưới.
// "Ngoài kho" chính là thứ tạo hình dạng — cắt một góc ra hình chữ L, cắt hai
// góc ra hình chữ U, không cắt gì thì là hình chữ nhật.
export function PlanEditor({
  warehouse,
  onClose,
}: {
  warehouse: WarehouseLite;
  onClose: () => void;
}) {
  const [cols, setCols] = useState(warehouse.cols);
  const [rows, setRows] = useState(warehouse.rows);
  const [grid, setGrid] = useState<LayoutGrid>(() =>
    parseGrid(warehouse.layout, warehouse.cols, warehouse.rows)
  );
  const [brush, setBrush] = useState<LayoutCell>(
    warehouse.zones[0]?.id ?? (AISLE as LayoutCell)
  );
  const [isPending, startTransition] = useTransition();

  const cellCounts = countCellsByZone(grid);

  function applySize(nextCols: number, nextRows: number) {
    const c = clampSide(nextCols, cols);
    const r = clampSide(nextRows, rows);
    setCols(c);
    setRows(r);
    setGrid((g) => resizeGrid(g, c, r));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveWarehousePlan(warehouse.id, cols, rows, grid);
        toast.success("Đã lưu sơ đồ kho");
        onClose();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  // Mỗi bút hiện đúng cái nó vẽ ra, để không phải đoán "Lối đi" trông thế nào.
  const brushes: { key: string; value: LayoutCell; label: string; className: string }[] = [
    ...warehouse.zones.map((z) => ({
      key: z.id,
      value: z.id as LayoutCell,
      label: `Khu ${z.code}`,
      className: zoneColor(z.color).badge,
    })),
    {
      key: "aisle",
      value: AISLE as LayoutCell,
      label: "Lối đi",
      className: AISLE_CLASS,
    },
    {
      key: "outside",
      value: null,
      label: "Ngoài kho",
      className: "border-dashed text-muted-foreground",
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-3 sm:p-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Chọn bút rồi quét lên lưới</p>
        <div className="flex flex-wrap gap-2">
          {brushes.map((b) => {
            const active = b.value === brush;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => setBrush(b.value)}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-sm font-medium transition-colors",
                  b.className,
                  active ? "border-primary ring-2 ring-primary/40" : "border-border"
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        {warehouse.zones.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Chưa có khu nào — thêm khu ở mục &quot;Khu vực&quot; bên dưới rồi quay lại tô.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-cols">Số cột</Label>
          <Input
            id="plan-cols"
            type="number"
            inputMode="numeric"
            min={MIN_SIDE}
            max={MAX_SIDE}
            value={cols}
            onChange={(e) => applySize(Number(e.target.value), rows)}
            className="w-24"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="plan-rows">Số hàng</Label>
          <Input
            id="plan-rows"
            type="number"
            inputMode="numeric"
            min={MIN_SIDE}
            max={MAX_SIDE}
            value={rows}
            onChange={(e) => applySize(cols, Number(e.target.value))}
            className="w-24"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Thu nhỏ lưới chỉ cắt phần ngoài rìa, phần đã vẽ bên trong vẫn giữ nguyên.
        </p>
      </div>

      <PlanGrid
        grid={grid}
        zones={warehouse.zones}
        onPaint={(r, c) => setGrid((g) => setCell(g, r, c, brush))}
      />

      {warehouse.zones.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {warehouse.zones
            .map((z) => `Khu ${z.code}: ${cellCounts[z.id] ?? 0} ô`)
            .join(" · ")}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSave} disabled={isPending} className="w-full sm:w-fit">
          Lưu sơ đồ
        </Button>
        <Button variant="outline" onClick={onClose} disabled={isPending} className="w-full sm:w-fit">
          Huỷ
        </Button>
      </div>
    </div>
  );
}
