// Mã định danh hàng hoá dán lên thùng/kệ: "1 - AKUMA - Clay - 56"
//   1     = code của khu vực đang chứa (đổi khi dời hàng)
//   AKUMA = brand, Clay = tên sản phẩm, 56 = size (ba phần này không đổi)
//
// Chuỗi này được *ghép lúc hiển thị*, không lưu vào DB. Nếu lưu cứng thì mỗi
// lần dời hàng là mã đổi theo, mà phiếu nhập/xuất cũ vẫn đang trỏ tới mã cũ.

export type LabelSku = {
  name: string;
  size?: string | null;
  brand: { name: string };
  zone?: { code: string } | null;
};

export function formatSkuLabel(sku: LabelSku): string {
  const parts: string[] = [];
  if (sku.zone) parts.push(sku.zone.code);
  parts.push(sku.brand.name, sku.name);
  if (sku.size) parts.push(sku.size);
  return parts.join(" - ");
}

// Phần cố định của mã, không có khu vực — dùng khi muốn nhấn mạnh "cái này
// không bao giờ đổi" (ví dụ cột mã trong danh mục SKU).
export function formatSkuBase(sku: Omit<LabelSku, "zone">): string {
  const parts = [sku.brand.name, sku.name];
  if (sku.size) parts.push(sku.size);
  return parts.join(" - ");
}

export function skuSearchText(sku: LabelSku & { code: string }): string {
  return [sku.code, sku.zone?.code, sku.brand.name, sku.name, sku.size]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// So sánh code khu theo kiểu người đọc: "2" trước "10", "A2" trước "A10".
// Hàng chưa gán khu luôn xuống cuối, vì đó là việc còn phải làm.
export function compareZoneCode(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" });
}
