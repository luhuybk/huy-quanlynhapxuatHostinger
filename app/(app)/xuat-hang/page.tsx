export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getTransactions, getTransactionCreators } from "@/lib/get-transactions";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionList } from "@/components/transaction-list";
import { TransactionFilters } from "@/components/date-range-filter";
import type { Prisma } from "@prisma/client";

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; partnerId?: string; createdById?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";
  const viewer = session?.user && { id: session.user.id, role };

  // STAFF only sees/uses agents they own or shared (chung) agents — keeps
  // other staff members' dealers and their exports out of view entirely.
  const agentWhere: Prisma.AgentWhereInput | undefined =
    role === "STAFF" ? { OR: [{ ownerId: null }, { ownerId: session!.user.id }] } : undefined;

  const [transactions, creators, agents, brands, skus] = await Promise.all([
    getTransactions("EXPORT", filters, viewer),
    getTransactionCreators("EXPORT", viewer),
    prisma.agent.findMany({ where: agentWhere, orderBy: { sortOrder: "asc" } }),
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Xuất hàng</h1>
        <TransactionForm
          type="EXPORT"
          role={role}
          agents={agents}
          brands={brands}
          skus={skuOptions}
        />
      </div>
      <TransactionFilters type="EXPORT" partners={agents} creators={creators} />
      <TransactionList
        type="EXPORT"
        role={role}
        transactions={transactions}
        agents={agents}
        brands={brands}
        skus={skuOptions}
      />
    </div>
  );
}
