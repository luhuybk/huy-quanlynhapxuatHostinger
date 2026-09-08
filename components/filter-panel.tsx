"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ActiveFilter = { key: string; label: string };

// Khung bộ lọc thu gọn được. Mặc định (khi chưa bấm nút) thì mở trên máy tính
// và đóng trên điện thoại — làm bằng CSS `hidden sm:block` để server và client
// render giống hệt nhau, không phải đoán cỡ màn hình lúc hydrate. Khi người
// dùng đã bấm nút thì open là true/false và quyết định cho mọi cỡ màn hình.
export function FilterPanel({
  active,
  onRemove,
  onClearAll,
  children,
}: {
  // Các lọc đang bật; hiện thành thẻ nhỏ khi bảng lọc đang thu gọn.
  active: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean | null>(null);

  const bodyClass =
    open === null ? "hidden sm:block" : open ? "block" : "hidden";
  const chipsClass = open === null ? "sm:hidden" : open ? "hidden" : "block";

  return (
    <div className="rounded-lg border bg-muted/30">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => (o === null ? true : !o))}
          className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 font-medium transition-colors hover:text-foreground"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Bộ lọc
          {active.length > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs leading-none font-semibold text-primary-foreground">
              {active.length}
            </span>
          )}
          {open === null ? (
            <>
              <ChevronDown className="h-4 w-4 sm:hidden" />
              <ChevronUp className="hidden h-4 w-4 sm:block" />
            </>
          ) : open ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {active.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={onClearAll}>
            Xoá lọc
          </Button>
        )}
      </div>

      {/* Thu gọn rồi vẫn thấy đang lọc những gì — bấm dấu x để bỏ từng cái. */}
      {active.length > 0 && (
        <div className={chipsClass}>
          <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
            {active.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => onRemove(f.key)}
                title="Bỏ lọc này"
                className="flex cursor-pointer items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-sm hover:bg-accent"
              >
                {f.label}
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trên điện thoại xếp 2 cột (ô select lấy đủ chiều rộng của cột, không
          bị co lại chỉ còn mũi tên); từ sm trở lên mới xếp hàng ngang. */}
      <div className={bodyClass}>
        <div className="grid grid-cols-2 items-end gap-x-3 gap-y-4 border-t px-3 py-3 sm:flex sm:flex-wrap">
          {children}
        </div>
      </div>
    </div>
  );
}
