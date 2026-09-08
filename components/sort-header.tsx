"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Tiêu đề cột bấm được để đổi cách sắp xếp. Bấm lần đầu xếp theo cột đó,
// bấm lại thì đảo chiều. Cột đang dùng để sắp xếp có mũi tên chỉ chiều.
export function SortHeader({
  field,
  children,
  defaultField = "date",
}: {
  field: string;
  children: React.ReactNode;
  // Cột được dùng khi URL chưa có tham số sắp xếp nào.
  defaultField?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeField = searchParams.get("sort") ?? defaultField;
  const activeDir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const isActive = activeField === field;

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", field);
    // Đang ở cột này thì đảo chiều, sang cột khác thì bắt đầu lại từ đầu:
    // ngày = mới nhất trước, đối tác = A-Z.
    const nextDir = isActive
      ? activeDir === "asc"
        ? "desc"
        : "asc"
      : field === "date"
        ? "desc"
        : "asc";
    params.set("dir", nextDir);
    router.push(`${pathname}?${params.toString()}`);
  }

  const Icon = !isActive ? ChevronsUpDown : activeDir === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "-mx-1 flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:text-foreground",
        isActive && "text-foreground"
      )}
      title="Bấm để đổi cách sắp xếp"
    >
      {children}
      <Icon className={cn("h-3.5 w-3.5", !isActive && "opacity-40")} />
    </button>
  );
}
