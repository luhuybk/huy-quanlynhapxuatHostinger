export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTransactions, getTransactionCreators } from "@/lib/get-transactions";
import { getChinaImports } from "@/lib/get-china-imports";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { TransactionFilters } from "@/components/date-range-filter";
import { ChinaImportForm } from "@/components/china-import-form";
import { ChinaImportList } from "@/components/china-import-list";
import { ExportListButton } from "@/components/export-list-button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    partnerId?: string;
    createdById?: string;
    receivedWarehouse?: string;
    paidDebt?: string;
  }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";

  const [transactions, creators, chinaImports, suppliers, brands, skus] =
    await Promise.all([
      getTransactions("IMPORT", filters),
      getTransactionCreators("IMPORT"),
      getChinaImports(filters),
      prisma.supplier.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.brand.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.sku.findMany({
        orderBy: { sortOrder: "asc" },
        include: { brand: { select: { name: true } } },
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
  }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Hàng về kho</h1>

      <Tabs defaultValue="vn">
        <TabsList>
          <TabsTrigger value="vn">Hàng Việt Nam</TabsTrigger>
          <TabsTrigger value="china">Hàng Trung</TabsTrigger>
        </TabsList>

        <TabsContent value="vn" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap justify-end gap-2">
            <ExportListButton type="IMPORT" />
            <TransactionForm
              type="IMPORT"
              role={role}
              suppliers={suppliers}
              brands={brands}
              skus={skuOptions}
            />
          </div>
          <TransactionFilters
            type="IMPORT"
            partners={suppliers}
            creators={creators}
          />
          <TransactionList
            type="IMPORT"
            role={role}
            transactions={transactions}
            suppliers={suppliers}
            brands={brands}
            skus={skuOptions}
          />
        </TabsContent>

        <TabsContent value="china" className="mt-4 flex flex-col gap-4">
          <div className="flex justify-end">
            <ChinaImportForm />
          </div>
          <ChinaImportList role={role} imports={chinaImports} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
