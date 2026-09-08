"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type SummaryStat = {
  label: string;
  count: number;
  // Bộ lọc được bật khi bấm vào con số này; bấm lần nữa thì bỏ lọc.
  filterKey: string;
  filterValue: string;
};

// Dòng tóm tắt phía trên bảng: tổng số + số việc còn dang dở. Mỗi con số bấm
// được để lọc thẳng xuống đúng nhóm đó, khỏi phải mở dropdown.
export function ListSummary({
  total,
  totalLabel,
  stats,
}: {
  total: number;
  totalLabel: string;
  stats: SummaryStat[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  function toggle(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem]">
      <span className="font-semibold">
        {total} {totalLabel}
      </span>
      {stats.map((s) => {
        const active = searchParams.get(s.filterKey) === s.filterValue;
        return (
          <span key={s.label} className="flex items-center gap-2">
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => toggle(s.filterKey, s.filterValue)}
              title={active ? "Bỏ lọc" : `Chỉ xem ${s.label}`}
              className={cn(
                "cursor-pointer underline-offset-4 hover:underline",
                active && "font-semibold underline",
                s.count > 0
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground"
              )}
            >
              {s.count} {s.label}
            </button>
          </span>
        );
      })}
    </div>
  );
}
