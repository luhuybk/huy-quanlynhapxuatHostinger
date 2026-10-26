// Soạn danh sách order thành tin nhắn chữ thường để dán qua Zalo/Messenger
// gửi hãng. Không dùng markdown hay ký tự đặc biệt vì mỗi app hiển thị khác.

export type OrderTextItem = {
  skuId: string | null;
  itemName: string;
  quantity: number;
  note: string | null;
};

// Gộp các dòng trùng hàng (cùng SKU, hoặc cùng tên nếu gõ tự do) và cộng số
// lượng, giữ thứ tự xuất hiện đầu tiên. Cần khi gộp nhiều đợt cùng brand:
// hãng chỉ cần biết tổng mỗi món.
export function mergeOrderItems(items: OrderTextItem[]): OrderTextItem[] {
  const byKey = new Map<string, OrderTextItem>();
  for (const it of items) {
    const key = it.skuId ?? `name:${it.itemName.trim().toLowerCase()}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...it, note: it.note?.trim() || null });
      continue;
    }
    prev.quantity += it.quantity;
    const note = it.note?.trim();
    if (note && !(prev.note ?? "").split("; ").includes(note)) {
      prev.note = prev.note ? `${prev.note}; ${note}` : note;
    }
  }
  return [...byKey.values()];
}

export function buildOrderText({
  title,
  items,
  notes = [],
  includeNotes,
}: {
  title: string;
  items: OrderTextItem[];
  // Ghi chú chung của cả đợt, in cuối tin.
  notes?: (string | null)[];
  includeNotes: boolean;
}) {
  // Không ghi ngày: tin gửi đi đã có giờ gửi, ngày của đợt chỉ là ngày ghi
  // nhớ nội bộ nên dễ làm hãng hiểu nhầm.
  const lines = [title, ""];
  for (const it of items) {
    const note = includeNotes && it.note?.trim() ? ` (${it.note.trim()})` : "";
    lines.push(`• ${it.itemName.trim()}: ${it.quantity}${note}`);
  }
  const total = items.reduce((sum, it) => sum + it.quantity, 0);
  lines.push("", `Tổng: ${items.length} món, ${total} sản phẩm`);
  if (includeNotes) {
    for (const n of notes) if (n?.trim()) lines.push(`Ghi chú: ${n.trim()}`);
  }
  return lines.join("\n");
}
