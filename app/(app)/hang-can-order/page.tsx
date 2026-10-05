export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getChinaOrderItems } from "@/lib/get-china-order-items";
import { getVnOrders } from "@/lib/get-vn-orders";
import { ChinaOrderList } from "@/components/china-order-list";
import { VnOrderForm } from "@/components/vn-order-form";
import { VnOrderList } from "@/components/vn-order-list";
import { VnOrderFilters } from "@/components/vn-order-filters";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ brandId?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";

  const [chinaItems, vnOrders, brands, skus] = await Promise.all([
    getChinaOrderItems(),
    getVnOrders(filters),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.sku.findMany({
      orderBy: [{ brand: { name: "asc" } }, { sortOrder: "asc" }],
      include: {
        brand: { select: { name: true } },
        zone: { select: { code: true, color: true } },
      },
    }),
  ]);

  const skuOptions = skus.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    brandId: s.brandId,
    brandName: s.brand.name,
    unitsPerCase: s.unitsPerCase,
    isQuickCreate: s.isQuickCreate,
    zoneCode: s.zone?.code ?? null,
    zoneColor: s.zone?.color ?? null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hàng cần order</h1>

      <Tabs defaultValue="vn">
        <TabsList>
          <TabsTrigger value="vn">Hàng Việt Nam</TabsTrigger>
          <TabsTrigger value="china">Hàng Trung</TabsTrigger>
        </TabsList>

        <TabsContent value="vn" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <VnOrderForm brands={brands} skus={skuOptions} />
          </div>
          <VnOrderFilters brands={brands} />
          <VnOrderList
            role={role}
            orders={vnOrders}
            brands={brands}
            skus={skuOptions}
          />
        </TabsContent>

        <TabsContent value="china" className="mt-4">
          <ChinaOrderList role={role} items={chinaItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
