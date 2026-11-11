// Soạn danh sách order thành tin nhắn chữ thường để dán qua Zalo/Messenger
// gửi hãng. Không dùng markdown hay ký tự đặc biệt vì mỗi app hiển thị khác.

export type OrderTextItem = {
  skuId: string | null;
  itemName: string;
  quantity: number;
  // Đợt cũ không có ô này: coi như lẻ.
  unitType?: string;
  note: string | null;
};

export function isCase(it: { unitType?: string }) {
  return it.unitType === "CASE";
}

// "2 thùng" / "5 lẻ" — dùng cả trong tin nhắn lẫn trên giao diện.
export function formatOrderQty(it: { quantity: number; unitType?: string }) {
  return `${it.quantity} ${isCase(it) ? "thùng" : "lẻ"}`;
}

// Tổng số lượng: "8" nếu toàn hàng lẻ, "2 thùng + 5 lẻ" nếu có món đặt thùng.
export function formatTotalQty(items: { quantity: number; unitType?: string }[]) {
  const sum = (list: typeof items) => list.reduce((s, it) => s + it.quantity, 0);
  const units = sum(items.filter((it) => !isCase(it)));
  if (!items.some(isCase)) return String(units);
  const cases = sum(items.filter(isCase));
  return [cases && `${cases} thùng`, units && `${units} lẻ`].filter(Boolean).join(" + ");
}

// Gộp các dòng trùng hàng (cùng SKU, hoặc cùng tên nếu gõ tự do) và cộng số
// lượng, giữ thứ tự xuất hiện đầu tiên. Cần khi gộp nhiều đợt cùng brand:
// hãng chỉ cần biết tổng mỗi món. Thùng và lẻ không cộng lẫn vào nhau.
export function mergeOrderItems(items: OrderTextItem[]): OrderTextItem[] {
  const byKey = new Map<string, OrderTextItem>();
  for (const it of items) {
    const key =
      (it.skuId ?? `name:${it.itemName.trim().toLowerCase()}`) + (isCase(it) ? "|case" : "|unit");
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
  // Đơn toàn hàng lẻ thì giữ cách ghi gọn như trước; có món đặt theo thùng
  // thì mọi dòng đều ghi rõ "thùng"/"lẻ" để hãng không đọc nhầm.
  const anyCase = items.some(isCase);
  const lines = [title, ""];
  for (const it of items) {
    const note = includeNotes && it.note?.trim() ? ` (${it.note.trim()})` : "";
    const qty = anyCase ? formatOrderQty(it) : String(it.quantity);
    lines.push(`• ${it.itemName.trim()}: ${qty}${note}`);
  }
  const total = formatTotalQty(items);
  lines.push("", `Tổng: ${items.length} món, ${anyCase ? total : `${total} sản phẩm`}`);
  if (includeNotes) {
    for (const n of notes) if (n?.trim()) lines.push(`Ghi chú: ${n.trim()}`);
  }
  return lines.join("\n");
}
