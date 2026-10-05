"use client";

import { useMemo, useState, useTransition } from "react";
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
  // Giữ ô nhập dưới dạng chuỗi: xoá trắng để gõ lại số khác là chuyện bình
  // thường, mà Number("") ra 0 nên nếu đổi kích thước theo từng ký tự thì vừa
  // xoá xong lưới đã co về tối thiểu.
  const [colsText, setColsText] = useState(String(warehouse.cols));
  const [rowsText, setRowsText] = useState(String(warehouse.rows));
  // Lưới gốc chỉ nở ra chứ không co lại. cols/rows chỉ là khung đang nhìn và
  // sẽ lưu, nên thu nhỏ rồi mở lại vẫn còn nguyên phần đã vẽ — chưa bấm Lưu
  // thì chưa mất gì.
  const [grid, setGrid] = useState<LayoutGrid>(() =>
    parseGrid(warehouse.layout, warehouse.cols, warehouse.rows)
  );
  const [brush, setBrush] = useState<LayoutCell>(
    warehouse.zones[0]?.id ?? (AISLE as LayoutCell)
  );
  const [isPending, startTransition] = useTransition();

  // Phần sẽ được lưu: cắt lưới gốc theo khung hiện tại.
  const view = useMemo(
    () => grid.slice(0, rows).map((row) => row.slice(0, cols)),
    [grid, rows, cols]
  );
  const cellCounts = countCellsByZone(view);

  function applySize(nextCols: number, nextRows: number) {
    setCols(nextCols);
    setRows(nextRows);
    setGrid((g) =>
      resizeGrid(
        g,
        Math.max(nextCols, g[0]?.length ?? 0),
        Math.max(nextRows, g.length)
      )
    );
  }

  // Chỉ đổi kích thước khi chuỗi đang gõ là một số hợp lệ; rời ô thì trả hiển
  // thị về đúng giá trị đang dùng.
  function handleSideChange(axis: "cols" | "rows", text: string) {
    if (axis === "cols") setColsText(text);
    else setRowsText(text);

    const n = Number(text);
    if (!text.trim() || !Number.isFinite(n) || n < MIN_SIDE || n > MAX_SIDE) return;
    applySize(axis === "cols" ? n : cols, axis === "rows" ? n : rows);
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveWarehousePlan(warehouse.id, cols, rows, view);
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
            value={colsText}
            onChange={(e) => handleSideChange("cols", e.target.value)}
            onBlur={() => setColsText(String(cols))}
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
            value={rowsText}
            onChange={(e) => handleSideChange("rows", e.target.value)}
            onBlur={() => setRowsText(String(rows))}
            className="w-24"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Thu nhỏ lưới chỉ giấu phần ngoài rìa. Mở rộng lại trước khi bấm Lưu thì
          phần đã vẽ vẫn còn nguyên.
        </p>
      </div>

      <PlanGrid
        grid={view}
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
