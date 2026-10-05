"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatSkuBase, formatSkuLabel } from "@/lib/sku-label";
import type { SkuLite, ZoneLite } from "@/components/warehouse/types";

type Mode = "sku" | "zone";

// Hai loại giấy in ra từ cùng một trang:
//   - Nhãn hàng hoá: dán lên từng thùng, chữ vừa phải, mỗi mã một nhãn
//   - Bảng tên kệ:   dán lên đầu kệ, chữ thật to để đứng xa vẫn đọc được
export function LabelSheet({
  warehouseName,
  zones,
  skus,
}: {
  warehouseName: string;
  zones: ZoneLite[];
  skus: SkuLite[];
}) {
  const [mode, setMode] = useState<Mode>("sku");
  const [zoneId, setZoneId] = useState("all");

  const skuCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of skus) if (s.zone) counts[s.zone.id] = (counts[s.zone.id] ?? 0) + 1;
    return counts;
  }, [skus]);

  const visibleSkus = useMemo(() => {
    const list = zoneId === "all" ? skus : skus.filter((s) => s.zone?.id === zoneId);
    return [...list].sort(
      (a, b) =>
        (a.zone?.code ?? "").localeCompare(b.zone?.code ?? "", "vi", { numeric: true }) ||
        a.brand.name.localeCompare(b.brand.name, "vi") ||
        a.name.localeCompare(b.name, "vi")
    );
  }, [skus, zoneId]);

  const visibleZones = zoneId === "all" ? zones : zones.filter((z) => z.id === zoneId);
  const count = mode === "sku" ? visibleSkus.length : visibleZones.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex rounded-md border p-0.5">
          {(
            [
              ["sku", "Nhãn hàng hoá"],
              ["zone", "Bảng tên kệ"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium",
                mode === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Select value={zoneId} onValueChange={setZoneId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả khu trong {warehouseName}</SelectItem>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                Khu {z.code}
                {z.name ? ` — ${z.name}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => window.print()}
          disabled={count === 0}
          className="w-full sm:w-fit"
        >
          <Printer className="h-4 w-4" /> In {count}{" "}
          {mode === "sku" ? "nhãn" : "bảng tên"}
        </Button>
      </div>

      {mode === "sku" ? (
        visibleSkus.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có mã hàng nào được gán vào khu của kho này.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 print:grid-cols-3 print:gap-1">
            {visibleSkus.map((s) => (
              <div
                key={s.id}
                className="flex break-inside-avoid flex-col gap-1 rounded-md border p-3 print:rounded-none"
              >
                <p className="font-mono text-lg leading-tight font-semibold">
                  {formatSkuLabel(s)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.code} · {formatSkuBase(s)}
                </p>
              </div>
            ))}
          </div>
        )
      ) : visibleZones.length === 0 ? (
        <p className="text-sm text-muted-foreground">Kho này chưa có khu nào.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-2">
          {visibleZones.map((z) => (
            <div
              key={z.id}
              className="flex break-inside-avoid flex-col items-center justify-center gap-2 rounded-md border p-8 text-center print:rounded-none print:border-2 print:border-black"
            >
              <p className="font-mono text-6xl leading-none font-bold">{z.code}</p>
              {z.name && <p className="text-lg">{z.name}</p>}
              <p className="text-xs text-muted-foreground">
                {skuCounts[z.id] ?? 0} mã hàng
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
