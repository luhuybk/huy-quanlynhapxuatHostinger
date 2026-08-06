export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { SidebarNav, MobileBottomNav } from "@/components/sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-muted/20 md:flex">
        <div className="border-b px-4 py-4">
          <p className="font-semibold">Quản lý kho</p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.name}
          </p>
        </div>
        <SidebarNav />
        <div className="mt-auto flex items-center gap-2 border-t p-3">
          <LogoutButton />
          <ThemeToggle />
        </div>
      </aside>

      <header className="flex items-center justify-between border-b px-4 py-3 md:hidden">
        <div>
          <p className="font-semibold">Quản lý kho</p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.name}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      <main className="flex-1 overflow-x-auto p-4 pb-20 md:p-6 md:pb-6">
        {children}
      </main>
      <MobileBottomNav />
      <Toaster />
    </div>
  );
}
