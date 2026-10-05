// Màu của khu vực trên sơ đồ. Tailwind v4 quét class trong source nên mọi
// class ở đây phải là chuỗi viết sẵn — ghép động kiểu `bg-${color}-100` sẽ
// không sinh ra CSS nào cả.
export const ZONE_COLORS = {
  teal: {
    label: "Xanh ngọc",
    cell: "bg-teal-100 border-teal-500 text-teal-900 dark:bg-teal-900 dark:border-teal-400 dark:text-teal-50",
    badge: "bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-50",
    dot: "bg-teal-500",
  },
  indigo: {
    label: "Tím",
    cell: "bg-indigo-100 border-indigo-500 text-indigo-900 dark:bg-indigo-900 dark:border-indigo-400 dark:text-indigo-50",
    badge: "bg-indigo-100 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-50",
    dot: "bg-indigo-500",
  },
  orange: {
    label: "Cam",
    cell: "bg-orange-100 border-orange-500 text-orange-900 dark:bg-orange-900 dark:border-orange-400 dark:text-orange-50",
    badge: "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-50",
    dot: "bg-orange-500",
  },
  rose: {
    label: "Hồng",
    cell: "bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-900 dark:border-rose-400 dark:text-rose-50",
    badge: "bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-50",
    dot: "bg-rose-500",
  },
  sky: {
    label: "Xanh dương",
    cell: "bg-sky-100 border-sky-500 text-sky-900 dark:bg-sky-900 dark:border-sky-400 dark:text-sky-50",
    badge: "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-50",
    dot: "bg-sky-500",
  },
  amber: {
    label: "Vàng",
    cell: "bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900 dark:border-amber-400 dark:text-amber-50",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-50",
    dot: "bg-amber-500",
  },
  lime: {
    label: "Xanh lá",
    cell: "bg-lime-100 border-lime-500 text-lime-900 dark:bg-lime-900 dark:border-lime-400 dark:text-lime-50",
    badge: "bg-lime-100 text-lime-900 dark:bg-lime-900 dark:text-lime-50",
    dot: "bg-lime-500",
  },
  slate: {
    label: "Xám",
    cell: "bg-slate-200 border-slate-500 text-slate-900 dark:bg-slate-700 dark:border-slate-400 dark:text-slate-50",
    badge: "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-50",
    dot: "bg-slate-500",
  },
} as const;

export type ZoneColor = keyof typeof ZONE_COLORS;

export const ZONE_COLOR_KEYS = Object.keys(ZONE_COLORS) as ZoneColor[];

export function zoneColor(color: string) {
  return ZONE_COLORS[color as ZoneColor] ?? ZONE_COLORS.teal;
}

// Màu gợi ý cho khu mới: đi lần lượt theo danh sách để các khu trong cùng một
// kho không bị trùng màu khi mới tạo.
export function suggestZoneColor(existingCount: number): ZoneColor {
  return ZONE_COLOR_KEYS[existingCount % ZONE_COLOR_KEYS.length];
}
