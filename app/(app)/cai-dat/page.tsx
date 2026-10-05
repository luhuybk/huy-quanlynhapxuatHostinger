export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SupplierManager } from "@/components/settings/supplier-manager";
import { AgentManager } from "@/components/settings/agent-manager";
import { BrandManager } from "@/components/settings/brand-manager";
import { SkuManager } from "@/components/settings/sku-manager";
import { UserManager } from "@/components/settings/user-manager";
import { ImportBackupDialog } from "@/components/settings/import-backup-dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Prisma } from "@prisma/client";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";
  const isStaff = session?.user.role === "STAFF";

  // STAFF only manages agents they own (or shared ones) — same scoping as
  // the EXPORT transaction list in xuat-hang/page.tsx.
  const agentWhere: Prisma.AgentWhereInput | undefined = isStaff
    ? { OR: [{ ownerId: null }, { ownerId: session!.user.id }] }
    : undefined;

  const [suppliers, agents, brands, skus, users, warehouses] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.agent.findMany({
      where: agentWhere,
      orderBy: { sortOrder: "asc" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.brand.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.sku.findMany({
      // Mặc định nhóm theo Brand (A-Z), trong từng Brand vẫn giữ thứ tự kéo thả.
      orderBy: [{ brand: { name: "asc" } }, { sortOrder: "asc" }],
      include: {
        brand: { select: { name: true } },
        zone: { select: { id: true, code: true, color: true } },
      },
    }),
    isAdmin
      ? prisma.user.findMany({
          orderBy: { name: "asc" },
          select: { id: true, email: true, name: true, role: true },
        })
      : Promise.resolve([]),
    prisma.warehouse.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        zones: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, code: true, name: true },
        },
      },
    }),
  ]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Cài đặt</h1>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href="/api/export" download>
                <Download className="h-4 w-4" /> Xuất dữ liệu backup (Excel)
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/backup-json" download>
                <Download className="h-4 w-4" /> Xuất backup đầy đủ (khôi phục chính xác)
              </a>
            </Button>
            <ImportBackupDialog />
          </div>
        )}
      </div>
      <Tabs defaultValue="sku">
        <TabsList>
          <TabsTrigger value="sku">SKU</TabsTrigger>
          <TabsTrigger value="supplier">Đối tác</TabsTrigger>
          <TabsTrigger value="agent">Đại lý</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Người dùng</TabsTrigger>}
        </TabsList>
        <TabsContent value="sku" className="mt-4">
          <SkuManager
            skus={skus}
            brands={brands}
            suppliers={suppliers}
            warehouses={warehouses}
          />
        </TabsContent>
        <TabsContent value="supplier" className="mt-4">
          <SupplierManager suppliers={suppliers} />
        </TabsContent>
        <TabsContent value="agent" className="mt-4">
          <AgentManager
            agents={agents}
            owners={users.filter((u) => u.role === "STAFF")}
            isAdmin={isAdmin}
          />
        </TabsContent>
        <TabsContent value="brand" className="mt-4">
          <BrandManager brands={brands} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UserManager
              users={users as { id: string; email: string; name: string; role: "ADMIN" | "SHARED" | "STAFF" }[]}
              currentUserId={session!.user.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
