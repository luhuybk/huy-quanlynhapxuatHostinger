export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { getChinaImports } from "@/lib/get-china-imports";
import { getChinaOrderItems } from "@/lib/get-china-order-items";
import { ChinaImportForm } from "@/components/china-import-form";
import { ChinaImportList } from "@/components/china-import-list";
import { ChinaOrderList } from "@/components/china-order-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function ChinaImportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";

  const [imports, orderItems] = await Promise.all([
    getChinaImports(filters),
    getChinaOrderItems(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Nhập hàng Trung</h1>

      <Tabs defaultValue="import">
        <TabsList>
          <TabsTrigger value="import">Nhập hàng</TabsTrigger>
          <TabsTrigger value="order">Hàng cần order</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <ChinaImportForm />
          </div>
          <ChinaImportList role={role} imports={imports} />
        </TabsContent>

        <TabsContent value="order" className="mt-4">
          <ChinaOrderList role={role} items={orderItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
