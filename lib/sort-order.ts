import { prisma } from "@/lib/prisma";

// sortOrder used to rely on Postgres-only autoincrement() on a non-id column.
// MySQL requires an autoincrement column to be a key, so new rows now get an
// explicit next value computed here instead.
export async function nextSortOrder(
  model: "supplier" | "agent" | "brand" | "sku"
): Promise<number> {
  let max: number | null;
  switch (model) {
    case "supplier":
      max = (await prisma.supplier.aggregate({ _max: { sortOrder: true } }))._max.sortOrder;
      break;
    case "agent":
      max = (await prisma.agent.aggregate({ _max: { sortOrder: true } }))._max.sortOrder;
      break;
    case "brand":
      max = (await prisma.brand.aggregate({ _max: { sortOrder: true } }))._max.sortOrder;
      break;
    case "sku":
      max = (await prisma.sku.aggregate({ _max: { sortOrder: true } }))._max.sortOrder;
      break;
  }
  return (max ?? -1) + 1;
}
