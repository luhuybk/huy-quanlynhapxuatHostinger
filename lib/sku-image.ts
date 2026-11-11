// Đường dẫn ảnh của một SKU, hoặc null nếu chưa có ảnh. Gắn mốc đổi ảnh vào
// URL để đổi ảnh là trình duyệt tải bản mới ngay dù ảnh cũ đang được cache.
export function skuImageUrl(sku: { id: string; imageUpdatedAt: Date | string | null }) {
  if (!sku.imageUpdatedAt) return null;
  return `/api/sku-image/${sku.id}?v=${new Date(sku.imageUpdatedAt).getTime()}`;
}
