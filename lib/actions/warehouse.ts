"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { nextSortOrder } from "@/lib/sort-order";
import { ZONE_COLOR_KEYS, suggestZoneColor } from "@/lib/zone-colors";
import {
  AISLE,
  cellAt,
  clampSide,
  clearZoneFromGrid,
  emptyGrid,
  parseGrid,
  serializeGrid,
  type LayoutGrid,
} from "@/lib/warehouse-layout";

async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

// Vẽ lại mặt bằng và chia khu là việc sắp xếp kho, không phải việc hằng ngày
// của nhân viên — STAFF vẫn xem được sơ đồ và vẫn đổi được khu của từng mã
// hàng (xem assignSkuZone), chỉ không tự thêm/xoá kho hay khu.
async function requireLayoutEditor() {
  const session = await requireAuth();
  if (session.user.role === "STAFF") {
    throw new Error("Chỉ Admin hoặc tài khoản chung mới được sửa sơ đồ kho");
  }
  return session;
}

function revalidateWarehouse() {
  revalidatePath("/so-do-kho");
  revalidatePath("/cai-dat");
  revalidatePath("/hang-ve-kho");
  revalidatePath("/xuat-hang");
}

// --- Kho ---

// Ô để trống phải ra kích thước mặc định, không phải 0 — Number("") là 0 nên
// clampSide sẽ kẹp xuống tối thiểu và tạo ra cái kho 2x2.
function sideFromForm(formData: FormData, key: string, fallback: number): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? clampSide(n, fallback) : fallback;
}

export async function createWarehouse(formData: FormData) {
  await requireLayoutEditor();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên kho không được để trống");
  const cols = sideFromForm(formData, "cols", 12);
  const rows = sideFromForm(formData, "rows", 8);
  const note = String(formData.get("note") ?? "").trim() || null;

  const created = await prisma.warehouse.create({
    data: {
      name,
      note,
      cols,
      rows,
      layout: serializeGrid(emptyGrid(cols, rows)),
      sortOrder: await nextSortOrder("warehouse"),
    },
  });
  revalidateWarehouse();
  return created.id;
}

export async function updateWarehouse(id: string, formData: FormData) {
  await requireLayoutEditor();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Tên kho không được để trống");
  const note = String(formData.get("note") ?? "").trim() || null;

  await prisma.warehouse.update({ where: { id }, data: { name, note } });
  revalidateWarehouse();
}

export async function deleteWarehouse(id: string) {
  await requireLayoutEditor();
  // Zone cascade theo kho; Sku.zoneId tự về null nên không mất mã hàng nào.
  await prisma.warehouse.delete({ where: { id } });
  revalidateWarehouse();
}

// Lưu cả mặt bằng sau khi vẽ: kích thước lưới và từng ô, trong một lần gọi —
// đổi số cột rồi tô thêm là cùng một thao tác với người dùng, không nên tách.
// Ô trỏ tới khu không thuộc kho này (khu vừa bị xoá ở tab khác chẳng hạn) bị
// hạ xuống thành lối đi thay vì làm hỏng cả lưới.
export async function saveWarehousePlan(
  id: string,
  cols: number,
  rows: number,
  grid: LayoutGrid
) {
  await requireLayoutEditor();
  const warehouse = await prisma.warehouse.findUniqueOrThrow({
    where: { id },
    include: { zones: { select: { id: true } } },
  });
  const valid = new Set(warehouse.zones.map((z) => z.id));

  const safeCols = clampSide(cols, warehouse.cols);
  const safeRows = clampSide(rows, warehouse.rows);

  const cleaned: LayoutGrid = Array.from({ length: safeRows }, (_, r) =>
    Array.from({ length: safeCols }, (_, c) => {
      const raw = cellAt(grid, r, c);
      const cell = raw === undefined ? AISLE : raw;
      if (cell === null) return null;
      if (cell === AISLE) return AISLE;
      return valid.has(cell) ? cell : AISLE;
    })
  );

  await prisma.warehouse.update({
    where: { id },
    data: { cols: safeCols, rows: safeRows, layout: serializeGrid(cleaned) },
  });
  revalidateWarehouse();
}

// --- Khu vực ---

// Chỉ đổi thành thông báo "trùng mã" khi đúng là lỗi unique (P2002); lỗi khác
// (mất kết nối chẳng hạn) phải giữ nguyên, báo sai thì càng khó tìm ra.
function duplicateCodeError(e: unknown, code: string): unknown {
  const prismaCode = (e as { code?: string })?.code;
  return prismaCode === "P2002"
    ? new Error(`Mã khu "${code}" đã được dùng ở một khu khác`)
    : e;
}

function parseColor(formData: FormData, fallback: string): string {
  const raw = String(formData.get("color") ?? "").trim();
  return (ZONE_COLOR_KEYS as readonly string[]).includes(raw) ? raw : fallback;
}

export async function createZone(warehouseId: string, formData: FormData) {
  await requireLayoutEditor();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) throw new Error("Mã khu không được để trống");
  const name = String(formData.get("name") ?? "").trim() || null;

  const count = await prisma.zone.count({ where: { warehouseId } });
  const color = parseColor(formData, suggestZoneColor(count));

  try {
    await prisma.zone.create({
      data: { warehouseId, code, name, color, sortOrder: await nextSortOrder("zone") },
    });
  } catch (e) {
    // code là mã in lên nhãn nên phải duy nhất toàn hệ thống, kể cả khi hai
    // kho khác nhau — trùng mã thì nhìn nhãn không biết hàng nằm kho nào.
    throw duplicateCodeError(e, code);
  }
  revalidateWarehouse();
}

export async function updateZone(id: string, formData: FormData) {
  await requireLayoutEditor();
  const code = String(formData.get("code") ?? "").trim();
  if (!code) throw new Error("Mã khu không được để trống");
  const name = String(formData.get("name") ?? "").trim() || null;

  const existing = await prisma.zone.findUniqueOrThrow({ where: { id } });
  const color = parseColor(formData, existing.color);

  try {
    await prisma.zone.update({ where: { id }, data: { code, name, color } });
  } catch (e) {
    throw duplicateCodeError(e, code);
  }
  revalidateWarehouse();
}

export async function deleteZone(id: string) {
  await requireLayoutEditor();
  const zone = await prisma.zone.findUniqueOrThrow({
    where: { id },
    include: { warehouse: true },
  });

  // Gỡ khu khỏi lưới và xoá khu trong cùng một transaction, để sơ đồ không
  // bao giờ còn ô trỏ tới khu đã mất.
  const grid = clearZoneFromGrid(
    parseGrid(zone.warehouse.layout, zone.warehouse.cols, zone.warehouse.rows),
    id
  );
  await prisma.$transaction([
    prisma.warehouse.update({
      where: { id: zone.warehouseId },
      data: { layout: serializeGrid(grid) },
    }),
    prisma.zone.delete({ where: { id } }),
  ]);
  revalidateWarehouse();
}

// --- Gán hàng vào khu ---
//
// Dời hàng là việc trong kho nên ai đăng nhập cũng làm được, khác với việc
// vẽ lại mặt bằng ở trên.

// Chuyển nhiều mã hàng cùng lúc — sắp xếp lại kho là dời cả chục mã một lượt,
// không ai sửa từng dòng.
export async function moveSkusToZone(skuIds: string[], zoneId: string | null) {
  await requireAuth();
  if (skuIds.length === 0) return 0;
  const result = await prisma.sku.updateMany({
    where: { id: { in: skuIds } },
    data: { zoneId },
  });
  revalidateWarehouse();
  return result.count;
}
