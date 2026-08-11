import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type Viewer = { id: string; role: "ADMIN" | "SHARED" | "STAFF" };
type TransactionFilters = {
  from?: string;
  to?: string;
  partnerId?: string;
  createdById?: string;
  agentOwnerId?: string;
};

function buildTransactionWhere(
  type: "IMPORT" | "EXPORT",
  filters: TransactionFilters,
  // STAFF only sees EXPORT transactions for agents they own or shared (chung)
  // agents — see Agent.ownerId in prisma/schema.prisma. Import stays unscoped.
  viewer?: Viewer
): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { type };

  if (filters.from || filters.to) {
    where.date = {};
    if (filters.from) where.date.gte = new Date(filters.from);
    if (filters.to) {
      const to = new Date(filters.to);
      to.setHours(23, 59, 59, 999);
      where.date.lte = to;
    }
  }

  if (filters.partnerId) {
    if (type === "IMPORT") where.supplierId = filters.partnerId;
    else where.agentId = filters.partnerId;
  }

  if (filters.createdById) where.createdById = filters.createdById;

  // "Đại lý của nhân viên" filter — lọc theo chủ sở hữu đại lý (tách biệt với
  // "Người tạo", vì ai cũng có thể tạo phiếu xuất cho đại lý của người khác).
  const agentConditions: Prisma.AgentWhereInput[] = [];
  if (type === "EXPORT" && viewer?.role === "STAFF") {
    agentConditions.push({ OR: [{ ownerId: null }, { ownerId: viewer.id }] });
  }
  if (type === "EXPORT" && filters.agentOwnerId) {
    agentConditions.push({ ownerId: filters.agentOwnerId });
  }
  if (agentConditions.length === 1) {
    where.agent = agentConditions[0];
  } else if (agentConditions.length > 1) {
    where.agent = { AND: agentConditions };
  }

  return where;
}

export async function getTransactions(
  type: "IMPORT" | "EXPORT",
  filters: TransactionFilters,
  viewer?: Viewer
) {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(type, filters, viewer),
    orderBy: { date: "desc" },
    include: {
      supplier: { select: { name: true } },
      agent: { select: { name: true } },
      createdBy: { select: { name: true } },
      items: {
        include: {
          sku: {
            include: { brand: { select: { name: true } } },
          },
        },
      },
    },
  });
}

// Distinct list of users who created a transaction of this type, scoped the
// same way as getTransactions (minus the date/partner/createdById filters,
// so the filter dropdown itself stays stable while other filters change).
export async function getTransactionCreators(type: "IMPORT" | "EXPORT", viewer?: Viewer) {
  const rows = await prisma.transaction.findMany({
    where: buildTransactionWhere(type, {}, viewer),
    distinct: ["createdById"],
    select: { createdBy: { select: { id: true, name: true } } },
  });
  return rows
    .map((r) => r.createdBy)
    .sort((a, b) => a.name.localeCompare(b.name));
}
