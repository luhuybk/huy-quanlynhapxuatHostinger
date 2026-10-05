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
import { formatSkuBase, formatSkuLabel } from "@/lib/sku-label";
import type { SkuLite, ZoneLite } from "@/components/warehouse/types";

// Nhãn để dán lên thùng và lên kệ. Không có bước in này thì sơ đồ chỉ nằm
// trong máy, ra kho vẫn phải đoán.
export function LabelSheet({
  warehouseName,
  zones,
  skus,
}: {
  warehouseName: string;
  zones: ZoneLite[];
  skus: SkuLite[];
}) {
  const [zoneId, setZoneId] = useState("all");

  const visible = useMemo(() => {
    const list = zoneId === "all" ? skus : skus.filter((s) => s.zone?.id === zoneId);
    return [...list].sort(
      (a, b) =>
        (a.zone?.code ?? "").localeCompare(b.zone?.code ?? "", "vi", { numeric: true }) ||
        a.brand.name.localeCompare(b.brand.name, "vi") ||
        a.name.localeCompare(b.name, "vi")
    );
  }, [skus, zoneId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
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
        <Button onClick={() => window.print()} className="w-full sm:w-fit">
          <Printer className="h-4 w-4" /> In {visible.length} nhãn
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Chưa có mã hàng nào được gán vào khu của kho này.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 print:grid-cols-3 print:gap-1">
          {visible.map((s) => (
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
      )}
    </div>
  );
}
