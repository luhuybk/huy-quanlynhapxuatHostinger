"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import { AISLE, type LayoutGrid } from "@/lib/warehouse-layout";
import type { ZoneLite } from "@/components/warehouse/types";

// Lối đi tô kín một màu xám đặc, nền lưới để trắng — nhìn là tách được ngay
// ba thứ: ô có màu (khu), ô xám (lối đi), ô trống (ngoài kho).
export const AISLE_CLASS = "bg-muted-foreground/20";

// Tường kho: vẽ nét đậm ở cạnh nào của ô giáp với bên ngoài. Ghép lại thành
// một đường bao liền quanh phần thuộc kho, nên nhìn là biết ngay trong/ngoài.
const WALL = "var(--foreground)";

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

  const inside = (r: number, c: number) =>
    grid[r]?.[c] !== undefined && grid[r][c] !== null;

  function wallShadow(r: number, c: number): string | undefined {
    const sides: string[] = [];
    if (!inside(r - 1, c)) sides.push(`inset 0 2px 0 0 ${WALL}`);
    if (!inside(r + 1, c)) sides.push(`inset 0 -2px 0 0 ${WALL}`);
    if (!inside(r, c - 1)) sides.push(`inset 2px 0 0 0 ${WALL}`);
    if (!inside(r, c + 1)) sides.push(`inset -2px 0 0 0 ${WALL}`);
    return sides.length ? sides.join(", ") : undefined;
  }

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
    <div className="flex flex-col gap-2">
      {/* Điện thoại: ô co lại cho cả sơ đồ vừa bề ngang, vì nếu phải vuốt ngang
          thì lúc đang tô sẽ giằng nhau giữa vuốt-để-cuộn và vuốt-để-vẽ.
          Máy tính: ô cố định 36px, rộng bao nhiêu cũng được, cuộn ngang nếu cần.
          Các ô dính liền nhau (không gap) để đường tường nối thành nét liền. */}
      {/* Kho 24 hàng cao gần 900px, để nguyên thì cuộn mãi mới tới danh sách
          khu. Trên máy tính giữ sơ đồ trong khung cao tối đa 65% màn hình và
          cho nó tự cuộn bên trong. Điện thoại thì ô đã co vừa bề ngang rồi
          nên không cần giới hạn. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:max-h-[65vh] sm:overflow-auto sm:px-0">
        <div
          className={cn(
            "grid w-full rounded-lg border bg-background p-2",
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
                      "aspect-square w-full sm:h-9 sm:w-9",
                      editing && "border border-dashed border-border/50"
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
                    className={cn(
                      "aspect-square w-full border border-border/50 sm:h-9 sm:w-9",
                      AISLE_CLASS
                    )}
                    style={{ boxShadow: wallShadow(r, c) }}
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
                    "aspect-square w-full overflow-hidden border text-[10px] font-medium sm:h-9 sm:w-9 sm:text-xs",
                    colors.cell,
                    dimmed && "opacity-30",
                    !editing && onZoneClick && "cursor-pointer"
                  )}
                  style={{ boxShadow: wallShadow(r, c) }}
                >
                  {zone.code}
                </button>
              );
            })
          )}
        </div>
      </div>

      <PlanLegend />
    </div>
  );
}

// Chú thích: không có nó thì ô xám vạch chéo và ô trống nhìn đều "không phải
// khu nào cả", không biết cái nào là lối đi cái nào là ngoài kho.
function PlanLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className={cn("h-4 w-4 border border-border/50", AISLE_CLASS)} />
        Lối đi
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-4 w-4 border-2 border-foreground" />
        Đường bao = tường kho
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-4 w-4 border border-dashed border-border" />
        Ngoài kho
      </span>
    </div>
  );
}
