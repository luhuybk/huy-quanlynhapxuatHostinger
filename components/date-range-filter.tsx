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
  creators,
  staffOwners,
}: {
  type: "IMPORT" | "EXPORT";
  partners: { id: string; name: string }[];
  creators?: { id: string; name: string }[];
  staffOwners?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const partnerId = searchParams.get("partnerId") ?? "";
  const createdById = searchParams.get("createdById") ?? "";
  const agentOwnerId = searchParams.get("agentOwnerId") ?? "";
  const partnerLabel = type === "IMPORT" ? "Đối tác" : "Đại lý";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = from || to || partnerId || createdById || agentOwnerId;

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
      {creators && creators.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Người tạo</Label>
          <Select
            value={createdById || "all"}
            onValueChange={(v) => setParam("createdById", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tất cả người tạo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả người tạo</SelectItem>
              {creators.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {staffOwners && staffOwners.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Đại lý của nhân viên</Label>
          <Select
            value={agentOwnerId || "all"}
            onValueChange={(v) => setParam("agentOwnerId", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Tất cả nhân viên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả nhân viên</SelectItem>
              {staffOwners.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          Xoá lọc
        </Button>
      )}
    </div>
  );
}
