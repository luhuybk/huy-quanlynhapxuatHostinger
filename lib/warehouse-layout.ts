// Lưới mặt bằng kho. Mỗi ô là một trong ba thứ:
//   - Zone.id  -> ô thuộc khu đó
//   - AISLE    -> lối đi / sàn trống, vẫn nằm trong kho
//   - null     -> ngoài tường, tức là không thuộc mặt bằng
// Chính trạng thái null tạo ra hình dạng: cắt bớt một góc là ra hình chữ L,
// cắt hai góc là hình chữ U, không cắt gì là hình chữ nhật.

export const AISLE = "aisle";

export type LayoutCell = string | null;
export type LayoutGrid = LayoutCell[][];

export const MIN_SIDE = 2;
export const MAX_SIDE = 40;

export function clampSide(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_SIDE, Math.max(MIN_SIDE, Math.round(n)));
}

// Lưới mới: cả mặt bằng là lối đi trống, người dùng tô khu và cắt hình sau.
export function emptyGrid(cols: number, rows: number): LayoutGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => AISLE as LayoutCell));
}

// Đọc layout từ DB. Dữ liệu hỏng/lệch kích thước không được làm sập trang —
// thiếu thì bù lối đi, thừa thì cắt bớt.
export function parseGrid(raw: string | null | undefined, cols: number, rows: number): LayoutGrid {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const source = Array.isArray(parsed) ? parsed : [];

  return Array.from({ length: rows }, (_, r) => {
    const row = Array.isArray(source[r]) ? (source[r] as unknown[]) : [];
    return Array.from({ length: cols }, (_, c) => {
      const cell = row[c];
      if (cell === null) return null;
      return typeof cell === "string" && cell ? cell : AISLE;
    });
  });
}

export function serializeGrid(grid: LayoutGrid): string {
  return JSON.stringify(grid);
}

// Đổi kích thước lưới: giữ nguyên phần đã vẽ, phần mới thêm là lối đi.
export function resizeGrid(grid: LayoutGrid, cols: number, rows: number): LayoutGrid {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => grid[r]?.[c] ?? (AISLE as LayoutCell))
  );
}

export function setCell(grid: LayoutGrid, r: number, c: number, value: LayoutCell): LayoutGrid {
  if (!grid[r] || c < 0 || c >= grid[r].length) return grid;
  if (grid[r][c] === value) return grid;
  const next = grid.map((row) => [...row]);
  next[r][c] = value;
  return next;
}

// Số ô mỗi khu đang chiếm — dùng để hiện "khu 1: 6 ô" và để cảnh báo khu chưa
// được tô lên sơ đồ.
export function countCellsByZone(grid: LayoutGrid): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of grid) {
    for (const cell of row) {
      if (cell && cell !== AISLE) counts[cell] = (counts[cell] ?? 0) + 1;
    }
  }
  return counts;
}

// Xoá một khu khỏi lưới (khi khu đó bị xoá): ô của nó trở lại thành lối đi.
export function clearZoneFromGrid(grid: LayoutGrid, zoneId: string): LayoutGrid {
  return grid.map((row) => row.map((cell) => (cell === zoneId ? AISLE : cell)));
}
