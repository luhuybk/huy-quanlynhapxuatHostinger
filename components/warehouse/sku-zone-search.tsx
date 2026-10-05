"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";
import { formatSkuBase, skuSearchText } from "@/lib/sku-label";
import type { SkuLite } from "@/components/warehouse/types";

// Tra hàng nằm ở đâu: gõ tên, brand, size hay mã SKU đều ra. Bấm vào kết quả
// thì sơ đồ nhảy sang kho đó và làm sáng khu đang chứa.
export function SkuZoneSearch({
  skus,
  onPick,
}: {
  skus: SkuLite[];
  onPick: (sku: SkuLite) => void;
}) {
  const [query, setQuery] = useState("");

  const indexed = useMemo(
    () => skus.map((s) => ({ sku: s, text: skuSearchText(s) })),
    [skus]
  );

  const q = query.trim().toLowerCase();
  const results = q ? indexed.filter((r) => r.text.includes(q)).slice(0, 20) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm hàng: tên, brand, size hoặc mã SKU..."
          className="pl-9"
        />
      </div>

      {q && (
        <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-md border">
          {results.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">Không tìm thấy mã hàng nào</li>
          )}
          {results.map(({ sku }) => (
            <li key={sku.id}>
              <button
                type="button"
                onClick={() => {
                  // Đóng danh sách sau khi chọn, để thấy ngay sơ đồ đang sáng
                  // khu nào thay vì bị kết quả che mất.
                  setQuery("");
                  onPick(sku);
                }}
                className="flex w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-muted"
              >
                <span className="flex flex-wrap items-center gap-2">
                  {sku.zone ? (
                    <span
                      className={cn(
                        "rounded px-1.5 text-xs font-medium",
                        zoneColor(sku.zone.color).badge
                      )}
                    >
                      {sku.zone.code}
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground">
                      chưa gán khu
                    </span>
                  )}
                  <span className="font-medium">{formatSkuBase(sku)}</span>
                </span>
                <span className="text-sm text-muted-foreground">{sku.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
