// Ô <input type="date"> nhận chuỗi "YYYY-MM-DD" và phải là ngày *địa phương*.
// Dùng toISOString() sẽ ra ngày theo giờ UTC: ở Việt Nam (UTC+7) thì từ 0h đến
// 7h sáng nó lùi mất một ngày, nên phiếu tạo lúc sáng sớm bị mặc định sang
// hôm qua. Lấy thẳng ngày/tháng/năm địa phương cũng khớp với cách danh sách
// hiển thị ngày (toLocaleDateString).
export function toDateInputValue(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
