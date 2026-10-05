"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import { AISLE, type LayoutGrid } from "@/lib/warehouse-layout";
import type { ZoneLite } from "@/components/warehouse/types";

// Lưới mặt bằng. Dùng chung cho cả chế độ xem và chế độ vẽ — truyền onPaint
// vào là thành bút tô.
export function PlanGrid({
  grid,
  zones,
  highlightZoneId,
  onPaint,
  onZoneClick,
}: {
  grid: LayoutGrid;
  zones: ZoneLite[];
  highlightZoneId?: string | null;
  onPaint?: (row: number, col: number) => void;
  onZoneClick?: (zoneId: string) => void;
}) {
  const painting = useRef(false);
  const lastCell = useRef<{ row: number; col: number } | null>(null);
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const cols = grid[0]?.length ?? 0;
  const editing = !!onPaint;

  // Kéo để tô: trên điện thoại pointerenter không bắn sang ô khác khi đang
  // giữ ngón, nên phải tự dò ô dưới ngón tay bằng elementFromPoint.
  //
  // Quẹt nhanh thì trình duyệt chỉ bắn vài điểm rời rạc, bỏ sót các ô ở giữa —
  // nên nối từ ô vừa tô tới ô hiện tại và tô hết đoạn đó, vệt quẹt mới liền.
  function paintAt(clientX: number, clientY: number) {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest<HTMLElement>("[data-cell]");
    if (!cell) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (!Number.isFinite(row) || !Number.isFinite(col)) return;

    const from = lastCell.current;
    if (from) {
      const steps = Math.max(Math.abs(row - from.row), Math.abs(col - from.col));
      for (let i = 1; i < steps; i++) {
        onPaint?.(
          Math.round(from.row + ((row - from.row) * i) / steps),
          Math.round(from.col + ((col - from.col) * i) / steps)
        );
      }
    }
    lastCell.current = { row, col };
    onPaint?.(row, col);
  }

  return (
    // Điện thoại: ô co lại cho cả sơ đồ vừa bề ngang, vì nếu phải vuốt ngang
    // thì lúc đang tô sẽ giằng nhau giữa vuốt-để-cuộn và vuốt-để-vẽ.
    // Máy tính: ô cố định 36px, rộng bao nhiêu cũng được, cuộn ngang nếu cần.
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        className={cn(
          "grid w-full gap-0.5 rounded-lg bg-muted/30 p-2",
          "[grid-template-columns:repeat(var(--plan-cols),minmax(0,1fr))]",
          "sm:w-fit sm:[grid-template-columns:repeat(var(--plan-cols),2.25rem)]",
          editing && "touch-none select-none"
        )}
        style={{ "--plan-cols": cols } as React.CSSProperties}
        onPointerDown={(e) => {
          if (!editing) return;
          painting.current = true;
          lastCell.current = null;
          paintAt(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!editing || !painting.current) return;
          paintAt(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          painting.current = false;
          lastCell.current = null;
        }}
        onPointerLeave={() => {
          painting.current = false;
          lastCell.current = null;
        }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const zone = cell && cell !== AISLE ? zoneById.get(cell) : undefined;
            const dimmed = !!highlightZoneId && !!zone && zone.id !== highlightZoneId;

            if (cell === null) {
              return (
                <div
                  key={`${r}-${c}`}
                  data-cell
                  data-row={r}
                  data-col={c}
                  aria-hidden
                  className={cn(
                    "aspect-square w-full rounded-sm sm:h-9 sm:w-9",
                    editing && "border border-dashed border-border/60"
                  )}
                />
              );
            }

            if (!zone) {
              return (
                <div
                  key={`${r}-${c}`}
                  data-cell
                  data-row={r}
                  data-col={c}
                  title="Lối đi"
                  className="aspect-square w-full rounded-sm border border-dashed border-border bg-background sm:h-9 sm:w-9"
                />
              );
            }

            const colors = zoneColor(zone.color);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                data-cell
                data-row={r}
                data-col={c}
                title={zone.name ? `Khu ${zone.code} — ${zone.name}` : `Khu ${zone.code}`}
                onClick={() => !editing && onZoneClick?.(zone.id)}
                className={cn(
                  "aspect-square w-full overflow-hidden rounded-sm border text-[10px] font-medium sm:h-9 sm:w-9 sm:text-xs",
                  colors.cell,
                  dimmed && "opacity-30",
                  !editing && onZoneClick && "cursor-pointer"
                )}
              >
                {zone.code}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
