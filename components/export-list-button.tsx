"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// Xuất Excel đúng những gì đang hiển thị: gắn nguyên bộ lọc hiện tại trên URL
// vào link tải, nên file tải về khớp với danh sách trên màn hình.
export function ExportListButton({ type }: { type: "IMPORT" | "EXPORT" }) {
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.set("type", type);

  return (
    <Button variant="outline" asChild>
      <a href={`/api/export-list?${params.toString()}`} download>
        <Download className="h-4 w-4" /> Xuất Excel
      </a>
    </Button>
  );
}
