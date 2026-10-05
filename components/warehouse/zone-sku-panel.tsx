"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import { formatSkuBase, skuSearchText } from "@/lib/sku-label";
import { moveSkusToZone } from "@/lib/actions/warehouse";
import type { SkuLite, WarehouseLite } from "@/components/warehouse/types";

// Danh sách hàng trong một khu, kèm chuyển khu theo lô. Sắp xếp lại kho là dời
// cả chục mã một lượt nên chọn nhiều rồi chuyển một lần là thao tác chính,
// không phải sửa từng dòng.
export function ZoneSkuPanel({
  title,
  description,
  skus,
  warehouses,
  stock,
}: {
  title: string;
  description?: string;
  skus: SkuLite[];
  warehouses: WarehouseLite[];
  stock: Record<string, number>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string>("");
  const [filter, setFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  // Kho có cả trăm mã nên danh sách thô không dùng được: lọc trước rồi mới
  // tick. "Chọn tất cả" cũng chỉ ăn vào phần đang lọc, để chuyển nguyên một
  // brand sang khu khác chỉ mất hai thao tác.
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? skus.filter((s) => skuSearchText(s).includes(q)) : skus;
  }, [skus, filter]);

  const allSelected = visible.length > 0 && visible.every((s) => selected.includes(s.id));

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function handleMove() {
    if (selected.length === 0 || !target) return;
    const zoneId = target === "none" ? null : target;
    const ids = selected;
    startTransition(async () => {
      try {
        const count = await moveSkusToZone(ids, zoneId);
        toast.success(
          zoneId ? `Đã chuyển ${count} mã hàng sang khu mới` : `Đã bỏ khu của ${count} mã hàng`
        );
        setSelected([]);
        setTarget("");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {skus.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có mã hàng nào ở đây.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Chuyển sang khu..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Bỏ khỏi khu</SelectItem>
                {warehouses.map((w) => (
                  <SelectGroup key={w.id}>
                    <SelectLabel>{w.name}</SelectLabel>
                    {w.zones.map((z) => (
                      <SelectItem key={z.id} value={z.id}>
                        {z.code}
                        {z.name ? ` — ${z.name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleMove}
              disabled={isPending || selected.length === 0 || !target}
              className="w-full sm:w-fit"
            >
              Chuyển {selected.length > 0 ? `${selected.length} mã` : ""}
            </Button>
          </div>

          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Lọc trong danh sách này..."
          />

          <div className="flex items-center gap-2">
            <Checkbox
              id="zone-select-all"
              checked={allSelected}
              onCheckedChange={() =>
                setSelected((cur) => {
                  const ids = visible.map((s) => s.id);
                  return allSelected
                    ? cur.filter((id) => !ids.includes(id))
                    : [...new Set([...cur, ...ids])];
                })
              }
            />
            <label htmlFor="zone-select-all" className="text-sm">
              Chọn tất cả ({visible.length})
            </label>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-sm text-muted-foreground underline"
              >
                Bỏ chọn {selected.length} mã
              </button>
            )}
          </div>

          <ul className="flex max-h-[26rem] flex-col divide-y overflow-y-auto rounded-md border">
            {visible.length === 0 && (
              <li className="p-3 text-sm text-muted-foreground">
                Không có mã nào khớp &quot;{filter}&quot;
              </li>
            )}
            {visible.map((s) => (
              <li key={s.id} className="flex items-start gap-3 p-3">
                <Checkbox
                  id={`zs-${s.id}`}
                  className="mt-0.5"
                  checked={selected.includes(s.id)}
                  onCheckedChange={() => toggle(s.id)}
                />
                <label htmlFor={`zs-${s.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    {s.zone && (
                      <span
                        className={cn(
                          "rounded px-1.5 text-xs font-medium",
                          zoneColor(s.zone.color).badge
                        )}
                      >
                        {s.zone.code}
                      </span>
                    )}
                    <span className="font-medium">{formatSkuBase(s)}</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.code} · còn {stock[s.id] ?? 0} sp
                  </span>
                </label>
              </li>
            ))}
          </ul>

        </>
      )}
    </div>
  );
}
