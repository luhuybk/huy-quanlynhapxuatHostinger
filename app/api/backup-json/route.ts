import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// Full-fidelity backup: keeps original ids, password hashes and every FK
// (kể cả Agent.ownerId) so a restore from này is exact — không như file
// Excel "Xuất dữ liệu backup" vốn chỉ để đọc, không giữ mật khẩu/id.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return new Response("Chỉ tài khoản Admin mới được xuất dữ liệu backup", {
      status: 403,
    });
  }

  const [
    users,
    brands,
    suppliers,
    agents,
    skus,
    transactions,
    chinaImports,
    chinaOrderItems,
    vnOrders,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.brand.findMany(),
    prisma.supplier.findMany(),
    prisma.agent.findMany(),
    prisma.sku.findMany(),
    prisma.transaction.findMany({ include: { items: true } }),
    prisma.chinaImport.findMany({ include: { items: true } }),
    prisma.chinaOrderItem.findMany(),
    prisma.vnOrder.findMany({ include: { items: true } }),
  ]);

  const payload = {
    format: "waxshop-full-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    users,
    brands,
    suppliers,
    agents,
    skus,
    transactions,
    chinaImports,
    chinaOrderItems,
    vnOrders,
  };

  const today = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="waxshop-full-backup-${today}.json"`,
    },
  });
}
