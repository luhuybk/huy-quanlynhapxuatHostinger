"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PackagePlus, PackageMinus, Ship, Settings } from "lucide-react";

const links = [
  { href: "/nhap-hang", label: "Nhập hàng", shortLabel: "Nhập hàng", icon: PackagePlus },
  { href: "/nhap-hang-trung", label: "Nhập hàng Trung", shortLabel: "Hàng Trung", icon: Ship },
  { href: "/xuat-hang", label: "Xuất hàng", shortLabel: "Xuất hàng", icon: PackageMinus },
  { href: "/cai-dat", label: "Cài đặt", shortLabel: "Cài đặt", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
      {links.map(({ href, shortLabel, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
              active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {shortLabel}
          </Link>
        );
      })}
    </nav>
  );
}
