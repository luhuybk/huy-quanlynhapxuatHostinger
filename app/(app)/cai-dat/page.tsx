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

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user.role === "ADMIN";

  const [suppliers, agents, brands, skus, users] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.agent.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.sku.findMany({
      orderBy: { name: "asc" },
      include: { brand: { select: { name: true } } },
    }),
    isAdmin
      ? prisma.user.findMany({
          orderBy: { name: "asc" },
          select: { id: true, email: true, name: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold">Cài đặt</h1>
      <Tabs defaultValue="sku">
        <TabsList>
          <TabsTrigger value="sku">SKU</TabsTrigger>
          <TabsTrigger value="supplier">Đối tác</TabsTrigger>
          <TabsTrigger value="agent">Đại lý</TabsTrigger>
          <TabsTrigger value="brand">Brand</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Người dùng</TabsTrigger>}
        </TabsList>
        <TabsContent value="sku" className="mt-4">
          <SkuManager skus={skus} brands={brands} suppliers={suppliers} />
        </TabsContent>
        <TabsContent value="supplier" className="mt-4">
          <SupplierManager suppliers={suppliers} />
        </TabsContent>
        <TabsContent value="agent" className="mt-4">
          <AgentManager agents={agents} />
        </TabsContent>
        <TabsContent value="brand" className="mt-4">
          <BrandManager brands={brands} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UserManager
              users={users as { id: string; email: string; name: string; role: "ADMIN" | "SHARED" }[]}
              currentUserId={session!.user.id}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
