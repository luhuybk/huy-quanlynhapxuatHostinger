"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { matchSupplierList, type MatchSku } from "@/lib/supplier-list-match";
import { cn } from "@/lib/utils";

// Hãng gửi danh sách mã đang có hàng: dán vào đây, máy tự ghép với mã trong
// kho, mã có trong danh sách = còn hàng, (tuỳ chọn) mã không có = hãng hết.
export function SupplierStockDialog({
  open,
  onOpenChange,
  brandName,
  skus,
  pending,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandName: string;
  skus: MatchSku[];
  pending: boolean;
  onApply: (availableIds: string[], outIds: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [markMissing, setMarkMissing] = useState(true);

  const matches = useMemo(() => matchSupplierList(text, skus, brandName), [text, skus, brandName]);
  const availableIds = [...new Set(matches.flatMap((m) => (m.sku ? [m.sku.id] : [])))];
  const outIds = markMissing ? skus.filter((s) => !availableIds.includes(s.id)).map((s) => s.id) : [];
  const unmatched = matches.filter((m) => !m.sku).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setText("");
        onOpenChange(o);
      }}
    >
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dán danh sách {brandName} gửi</DialogTitle>
          <DialogDescription>
            Mỗi dòng một mã, cứ dán nguyên tin nhắn của hãng. Tên brand, dung tích, quy cách
            (2X6) sẽ được bỏ qua khi so.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${brandName.toUpperCase()} CINNAMON MINT 85 ML 2X6\n${brandName.toUpperCase()} …`}
          className="min-h-32 font-mono text-sm"
          autoFocus
        />

        {matches.length > 0 && (
          <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border text-sm">
            {matches.map((m) => (
              <li key={m.line} className="grid gap-x-3 px-3 py-1.5 sm:grid-cols-2">
                <span className="truncate text-muted-foreground">{m.line}</span>
                <span className={cn(m.sku ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {m.sku ? `→ ${m.sku.name}${m.sku.size ? ` - ${m.sku.size}` : ""}` : "→ không khớp mã nào"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-start gap-2">
          <Checkbox id="mark-missing" checked={markMissing} onCheckedChange={(v) => setMarkMissing(v === true)} />
          <Label htmlFor="mark-missing" className="leading-snug font-normal">
            Mã {brandName} không có trong danh sách → đánh dấu <b>hãng hết</b>
          </Label>
        </div>

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {availableIds.length} mã còn hàng
            {markMissing && ` · ${outIds.length} mã hãng hết`}
            {unmatched > 0 && <span className="text-destructive"> · {unmatched} dòng không khớp</span>}
          </p>
          <Button
            disabled={pending || availableIds.length === 0}
            onClick={() => onApply(availableIds, outIds)}
          >
            {pending ? "Đang lưu…" : "Cập nhật tình trạng"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
