"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterPanel, type ActiveFilter } from "@/components/filter-panel";

const STATUSES = [
  { value: "pending", label: "Chưa đặt" },
  { value: "ordered", label: "Đã đặt, chưa về" },
  { value: "arrived", label: "Đã về" },
];

export function VnOrderFilters({ brands }: { brands: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const brandId = searchParams.get("brandId") ?? "";
  const status = searchParams.get("status") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const active: ActiveFilter[] = [];
  const brand = brands.find((b) => b.id === brandId);
  if (brand) active.push({ key: "brandId", label: brand.name });
  const statusOption = STATUSES.find((s) => s.value === status);
  if (statusOption) active.push({ key: "status", label: statusOption.label });

  return (
    <FilterPanel
      active={active}
      onRemove={(key) => setParam(key, "")}
      onClearAll={() => router.push(pathname)}
    >
      <div className="flex flex-col gap-1.5">
        <Label>Brand</Label>
        <Select
          value={brandId || "all"}
          onValueChange={(v) => setParam("brandId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Tất cả brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả brand</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Trạng thái</Label>
        <Select
          value={status || "all"}
          onValueChange={(v) => setParam("status", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tất cả trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterPanel>
  );
}
