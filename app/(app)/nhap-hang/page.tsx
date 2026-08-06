export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTransactions } from "@/lib/get-transactions";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { TransactionFilters } from "@/components/date-range-filter";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; partnerId?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";

  const [transactions, suppliers, brands, skus] = await Promise.all([
    getTransactions("IMPORT", filters),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.sku.findMany({
      orderBy: { name: "asc" },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Nhập hàng</h1>
        <TransactionForm
          type="IMPORT"
          role={role}
          suppliers={suppliers}
          brands={brands}
          skus={skuOptions}
        />
      </div>
      <TransactionFilters type="IMPORT" partners={suppliers} />
      <TransactionList
        type="IMPORT"
        role={role}
        transactions={transactions}
        suppliers={suppliers}
        brands={brands}
        skus={skuOptions}
      />
    </div>
  );
}
