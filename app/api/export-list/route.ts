import * as XLSX from "xlsx";
import { auth } from "@/auth";
import { getTransactions, type TransactionFilters } from "@/lib/get-transactions";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN");
}

// Xuất Excel đúng danh sách đang xem trên màn hình (theo bộ lọc hiện tại),
// khác với /api/export vốn là backup toàn bộ dữ liệu và chỉ Admin dùng.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const type = params.get("type") === "EXPORT" ? "EXPORT" : "IMPORT";

  const filters: TransactionFilters = {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    partnerId: params.get("partnerId") ?? undefined,
    createdById: params.get("createdById") ?? undefined,
    agentOwnerId: params.get("agentOwnerId") ?? undefined,
    receivedWarehouse: params.get("receivedWarehouse") ?? undefined,
    paidDebt: params.get("paidDebt") ?? undefined,
    goodsShipped: params.get("goodsShipped") ?? undefined,
    paid: params.get("paid") ?? undefined,
    settled: params.get("settled") ?? undefined,
    sort: params.get("sort") ?? undefined,
    dir: params.get("dir") ?? undefined,
  };

  // Truyền viewer để STAFF chỉ xuất được phiếu của đại lý mình quản lý —
  // đúng phạm vi họ nhìn thấy trên màn hình.
  const transactions = await getTransactions(type, filters, {
    id: session.user.id,
    role: session.user.role,
  });

  const isImport = type === "IMPORT";
  const partnerLabel = isImport ? "Đối tác" : "Đại lý";

  // Một dòng cho mỗi mặt hàng, kèm thông tin phiếu — tiện lọc/pivot trong Excel.
  const rows = transactions.flatMap((t) =>
    t.items.map((it) => ({
      "Mã phiếu": t.code,
      "Ngày": formatDate(t.date),
      [partnerLabel]: t.supplier?.name ?? t.agent?.name ?? "",
      "SKU": it.sku.code,
      "Tên hàng": it.sku.name,
      "Brand": it.sku.brand.name,
      "Đơn vị": it.unitType === "CASE" ? "Thùng" : "Lẻ",
      "Số lượng": it.quantityInput,
      "SL quy đổi": it.quantityUnits,
      ...(isImport
        ? {
            "Khớp SL": it.matchedQuantity ? "Có" : "Không",
            "Khớp CN": it.matchedDebt ? "Có" : "Không",
            "Nhập kho": t.receivedWarehouse ? "Có" : "Không",
            "Đã TT công nợ": t.paidDebt ? "Có" : "Không",
          }
        : {
            "Đã xuất hàng": t.goodsShipped ? "Có" : "Không",
            "Đã thanh toán": t.paid ? "Có" : "Không",
            "Tất toán": t.settled ? "Có" : "Không",
          }),
      "Ghi chú": t.note ?? "",
      "Người tạo": t.createdBy.name,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rows),
    isImport ? "Hang ve kho" : "Xuat hang"
  );

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);
  const name = isImport ? "hang-ve-kho" : "xuat-hang";

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}-${today}.xlsx"`,
    },
  });
}
