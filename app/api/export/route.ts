import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Date(d).toLocaleString("vi-VN");
}

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
    transactions,
    chinaImports,
    chinaOrderItems,
    skus,
    brands,
    suppliers,
    agents,
    users,
  ] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { date: "desc" },
      include: {
        supplier: { select: { name: true } },
        agent: { select: { name: true, owner: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { sku: { select: { code: true, name: true } } } },
      },
    }),
    prisma.chinaImport.findMany({
      orderBy: { date: "desc" },
      include: { createdBy: { select: { name: true } }, items: true },
    }),
    prisma.chinaOrderItem.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    prisma.sku.findMany({
      orderBy: { name: "asc" },
      include: {
        brand: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.agent.findMany({
      orderBy: { name: "asc" },
      include: { owner: { select: { name: true } } },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
  ]);

  const wb = XLSX.utils.book_new();

  const transactionRows = transactions.flatMap((t) =>
    t.items.map((it) => ({
      "Mã phiếu": t.code,
      "Loại": t.type === "IMPORT" ? "Nhập hàng" : "Xuất hàng",
      "Ngày": formatDate(t.date),
      "Đối tác/Đại lý": t.supplier?.name ?? t.agent?.name ?? "",
      "Chủ sở hữu đại lý": t.agent ? t.agent.owner?.name ?? "Chung" : "",
      "SKU": it.sku.code,
      "Tên hàng": it.sku.name,
      "Đơn vị": it.unitType === "CASE" ? "Thùng" : "Lẻ",
      "SL nhập": it.quantityInput,
      "SL quy đổi": it.quantityUnits,
      "Khớp SL": it.matchedQuantity ? "Có" : "Không",
      "Khớp CN": it.matchedDebt ? "Có" : "Không",
      "Nhập kho": t.receivedWarehouse ? "Có" : "Không",
      "Đã TT công nợ": t.paidDebt ? "Có" : "Không",
      "Đã xuất hàng": t.goodsShipped ? "Có" : "Không",
      "Đã thanh toán": t.paid ? "Có" : "Không",
      "Tất toán": t.settled ? "Có" : "Không",
      "Ghi chú": t.note ?? "",
      "Người tạo": t.createdBy.name,
    }))
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(transactionRows),
    "Nhap-Xuat hang"
  );

  const chinaImportRows = chinaImports.flatMap((ci) =>
    ci.items.map((it) => ({
      "Mã phiếu": ci.code,
      "Ngày": formatDate(ci.date),
      "Tên hàng": it.itemName,
      "Số lượng": it.quantity,
      "Ghi chú dòng": it.note ?? "",
      "Ghi chú phiếu": ci.note ?? "",
      "Người tạo": ci.createdBy.name,
    }))
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(chinaImportRows),
    "Nhap hang Trung"
  );

  const orderItemRows = chinaOrderItems.map((it) => ({
    "Tên hàng": it.itemName,
    "Số lượng": it.quantity,
    "Ghi chú": it.note ?? "",
    "Đã order": it.ordered ? "Có" : "Chưa",
    "Ngày điền": formatDate(it.createdAt),
    "Người thêm": it.createdBy.name,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(orderItemRows),
    "Hang can order"
  );

  const skuRows = skus.map((s) => ({
    "Mã SKU": s.code,
    "Tên hàng": s.name,
    "Brand": s.brand.name,
    "SL/thùng": s.unitsPerCase,
    "Nhà cung cấp": s.supplier?.name ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skuRows), "SKU");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(brands.map((b) => ({ "Brand": b.name }))),
    "Brand"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      suppliers.map((s) => ({ "Đối tác": s.name, "Ghi chú": s.note ?? "" }))
    ),
    "Doi tac"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      agents.map((a) => ({
        "Đại lý": a.name,
        "Ghi chú": a.note ?? "",
        "Chủ sở hữu": a.owner?.name ?? "Chung",
      }))
    ),
    "Dai ly"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      users.map((u) => ({
        "Tên": u.name,
        "Email": u.email,
        "Vai trò": u.role,
        "Ngày tạo": formatDate(u.createdAt),
      }))
    ),
    "Nguoi dung"
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="waxshop-backup-${today}.xlsx"`,
    },
  });
}
