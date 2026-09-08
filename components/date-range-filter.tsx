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

// Bộ lọc theo cờ trạng thái của phiếu. Giá trị "1"/"0" khớp với boolFilter()
// trong lib/get-transactions.ts.
const STATUS_FILTERS: Record<
  "IMPORT" | "EXPORT",
  { key: string; label: string; doneLabel: string; pendingLabel: string }[]
> = {
  IMPORT: [
    {
      key: "receivedWarehouse",
      label: "Nhập kho",
      doneLabel: "Đã nhập kho",
      pendingLabel: "Chưa nhập kho",
    },
    {
      key: "paidDebt",
      label: "Công nợ",
      doneLabel: "Đã TT công nợ",
      pendingLabel: "Chưa TT công nợ",
    },
  ],
  EXPORT: [
    {
      key: "goodsShipped",
      label: "Xuất hàng",
      doneLabel: "Đã xuất",
      pendingLabel: "Chưa xuất",
    },
    {
      key: "paid",
      label: "Thanh toán",
      doneLabel: "Đã thanh toán",
      pendingLabel: "Chưa thanh toán",
    },
    {
      key: "settled",
      label: "Tất toán",
      doneLabel: "Đã tất toán",
      pendingLabel: "Chưa tất toán",
    },
  ],
};

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
  const statusFilters = STATUS_FILTERS[type];

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters =
    from ||
    to ||
    partnerId ||
    createdById ||
    agentOwnerId ||
    statusFilters.some((s) => searchParams.get(s.key));

  return (
    // Trên điện thoại xếp 2 cột (ô select lấy đủ chiều rộng của cột, không bị
    // co lại chỉ còn mũi tên); từ sm trở lên mới xếp hàng ngang tự xuống dòng.
    <div className="grid grid-cols-2 items-end gap-x-3 gap-y-4 rounded-lg border bg-muted/30 p-3 sm:flex sm:flex-wrap">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">Từ ngày</Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setParam("from", e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">Đến ngày</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setParam("to", e.target.value)}
          className="w-full sm:w-40"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>{partnerLabel}</Label>
        <Select
          value={partnerId || "all"}
          onValueChange={(v) => setParam("partnerId", v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full sm:w-52">
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

      {statusFilters.map((s) => (
        <div key={s.key} className="flex flex-col gap-1.5">
          <Label>{s.label}</Label>
          <Select
            value={searchParams.get(s.key) || "all"}
            onValueChange={(v) => setParam(s.key, v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Tất cả" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="1">{s.doneLabel}</SelectItem>
              <SelectItem value="0">{s.pendingLabel}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}

      {creators && creators.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Người tạo</Label>
          <Select
            value={createdById || "all"}
            onValueChange={(v) => setParam("createdById", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-44">
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
        <div className="flex flex-col gap-1.5">
          <Label>Đại lý của nhân viên</Label>
          <Select
            value={agentOwnerId || "all"}
            onValueChange={(v) => setParam("agentOwnerId", v === "all" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-44">
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
