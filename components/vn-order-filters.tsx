"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
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
      <div className="flex flex-col gap-2">
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
      {(brandId || status) && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
}
