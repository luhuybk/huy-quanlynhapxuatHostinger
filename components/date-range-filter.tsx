"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TransactionFilters({
  type,
  partners,
}: {
  type: "IMPORT" | "EXPORT";
  partners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const partnerId = searchParams.get("partnerId") ?? "";
  const partnerLabel = type === "IMPORT" ? "Đối tác" : "Đại lý";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = from || to || partnerId;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="from">Từ ngày</Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setParam("from", e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="to">Đến ngày</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setParam("to", e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>{partnerLabel}</Label>
        <Select
          value={partnerId || "all"}
          onValueChange={(v) => setParam("partnerId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder={`Tất cả ${partnerLabel.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả {partnerLabel.toLowerCase()}</SelectItem>
            {partners.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
}
