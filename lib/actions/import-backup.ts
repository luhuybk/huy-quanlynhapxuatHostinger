"use server";

import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { nextSortOrder } from "@/lib/sort-order";

export type ImportSummary = {
  brands: { created: number; matched: number };
  suppliers: { created: number; matched: number };
  agents: { created: number; matched: number };
  skus: { created: number; updated: number };
  users: {
    created: number;
    skipped: number;
    tempPasswords: { email: string; password: string }[];
  };
  transactions: { created: number; skipped: number };
  chinaImports: { created: number; skipped: number };
  chinaOrderItems: { created: number };
  warnings: string[];
};

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") {
    throw new Error("Chỉ Admin mới có quyền nhập dữ liệu backup");
  }
  return session;
}

function truthy(v: unknown) {
  return String(v ?? "").trim() === "Có";
}

function str(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? "").trim();
}

function num(row: Record<string, unknown>, key: string): number {
  const n = Number(row[key]);
  return Number.isFinite(n) ? n : 0;
}

// Backup rows store dates as "HH:mm:ss d/M/yyyy" (from Date.toLocaleString("vi-VN")).
function parseViDateTime(value: string): Date | null {
  const m = value.match(/^(\d{1,2}):(\d{2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, hh, mm, ss, d, mo, y] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function randomPassword(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

function sheetRows(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = map.get(k);
    if (arr) arr.push(row);
    else map.set(k, [row]);
  }
  return map;
}

export async function importBackup(formData: FormData): Promise<ImportSummary> {
  const session = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Vui lòng chọn file backup (.xlsx)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  const summary: ImportSummary = {
    brands: { created: 0, matched: 0 },
    suppliers: { created: 0, matched: 0 },
    agents: { created: 0, matched: 0 },
    skus: { created: 0, updated: 0 },
    users: { created: 0, skipped: 0, tempPasswords: [] },
    transactions: { created: 0, skipped: 0 },
    chinaImports: { created: 0, skipped: 0 },
    chinaOrderItems: { created: 0 },
    warnings: [],
  };

  // --- Brand ---
  const brandByName = new Map<string, string>();
  for (const b of await prisma.brand.findMany({ select: { id: true, name: true } })) {
    brandByName.set(b.name, b.id);
  }
  for (const row of sheetRows(wb, "Brand")) {
    const name = str(row, "Brand");
    if (!name) continue;
    if (brandByName.has(name)) {
      summary.brands.matched++;
      continue;
    }
    const created = await prisma.brand.create({
      data: { name, sortOrder: await nextSortOrder("brand") },
    });
    brandByName.set(name, created.id);
    summary.brands.created++;
  }

  // --- Đối tác (Supplier) ---
  const supplierByName = new Map<string, string>();
  for (const s of await prisma.supplier.findMany({ select: { id: true, name: true } })) {
    if (!supplierByName.has(s.name)) supplierByName.set(s.name, s.id);
  }
  for (const row of sheetRows(wb, "Doi tac")) {
    const name = str(row, "Đối tác");
    if (!name) continue;
    if (supplierByName.has(name)) {
      summary.suppliers.matched++;
      continue;
    }
    const note = str(row, "Ghi chú") || null;
    const created = await prisma.supplier.create({
      data: { name, note, sortOrder: await nextSortOrder("supplier") },
    });
    supplierByName.set(name, created.id);
    summary.suppliers.created++;
  }

  // --- SKU (mã SKU là duy nhất -> upsert) ---
  const skuByCode = new Map<string, string>();
  for (const row of sheetRows(wb, "SKU")) {
    const code = str(row, "Mã SKU");
    const name = str(row, "Tên hàng");
    const brandName = str(row, "Brand");
    if (!code || !name) continue;
    const brandId = brandByName.get(brandName);
    if (!brandId) {
      summary.warnings.push(`Bỏ qua SKU "${code}": không tìm thấy brand "${brandName}"`);
      continue;
    }
    const supplierName = str(row, "Nhà cung cấp");
    const supplierId = supplierName ? supplierByName.get(supplierName) ?? null : null;
    const unitsPerCase = num(row, "SL/thùng") || 1;

    const existing = await prisma.sku.findUnique({ where: { code } });
    if (existing) {
      await prisma.sku.update({
        where: { code },
        data: { name, brandId, unitsPerCase, supplierId },
      });
      summary.skus.updated++;
    } else {
      await prisma.sku.create({
        data: {
          code,
          name,
          brandId,
          unitsPerCase,
          supplierId,
          sortOrder: await nextSortOrder("sku"),
        },
      });
      summary.skus.created++;
    }
    skuByCode.set(code, code);
  }

  // --- Người dùng (không có mật khẩu trong backup -> tạo mật khẩu tạm) ---
  const userByName = new Map<string, string>();
  const existingUsers = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });
  const userByEmail = new Map(existingUsers.map((u) => [u.email, u.id]));
  for (const u of existingUsers) {
    if (!userByName.has(u.name)) userByName.set(u.name, u.id);
  }
  for (const row of sheetRows(wb, "Nguoi dung")) {
    const name = str(row, "Tên");
    const email = str(row, "Email").toLowerCase();
    let role = str(row, "Vai trò");
    if (!name || !email) continue;
    if (role !== "ADMIN" && role !== "SHARED" && role !== "STAFF") role = "SHARED";

    if (userByEmail.has(email)) {
      summary.users.skipped++;
      continue;
    }
    const password = randomPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: { email, name, role, passwordHash },
    });
    userByEmail.set(email, created.id);
    if (!userByName.has(name)) userByName.set(name, created.id);
    summary.users.created++;
    summary.users.tempPasswords.push({ email, password });
  }

  // --- Đại lý (Agent) — "Chủ sở hữu" trong backup ghi tên nhân viên hoặc "Chung" ---
  const agentByName = new Map<string, string>();
  for (const a of await prisma.agent.findMany({ select: { id: true, name: true } })) {
    if (!agentByName.has(a.name)) agentByName.set(a.name, a.id);
  }
  for (const row of sheetRows(wb, "Dai ly")) {
    const name = str(row, "Đại lý");
    if (!name) continue;
    if (agentByName.has(name)) {
      summary.agents.matched++;
      continue;
    }
    const note = str(row, "Ghi chú") || null;
    const ownerName = str(row, "Chủ sở hữu");
    let ownerId: string | null = null;
    if (ownerName && ownerName !== "Chung") {
      ownerId = userByName.get(ownerName) ?? null;
      if (!ownerId) {
        summary.warnings.push(
          `Đại lý "${name}": không tìm thấy chủ sở hữu "${ownerName}", để "Chung"`
        );
      }
    }
    const created = await prisma.agent.create({
      data: { name, note, ownerId, sortOrder: await nextSortOrder("agent") },
    });
    agentByName.set(name, created.id);
    summary.agents.created++;
  }

  // --- Phiếu nhập/xuất hàng ---
  const txRows = sheetRows(wb, "Nhap-Xuat hang");
  const txGroups = groupBy(txRows, (r) => str(r, "Mã phiếu"));
  for (const [code, rows] of txGroups) {
    if (!code) continue;
    if (await prisma.transaction.findUnique({ where: { code } })) {
      summary.transactions.skipped++;
      continue;
    }
    const first = rows[0];
    const type = str(first, "Loại") === "Nhập hàng" ? "IMPORT" : "EXPORT";
    const date = parseViDateTime(str(first, "Ngày")) ?? new Date();
    const partnerName = str(first, "Đối tác/Đại lý");

    let supplierId: string | null = null;
    let agentId: string | null = null;
    if (partnerName) {
      if (type === "IMPORT") {
        supplierId = supplierByName.get(partnerName) ?? null;
        if (!supplierId) {
          const created = await prisma.supplier.create({
            data: { name: partnerName, sortOrder: await nextSortOrder("supplier") },
          });
          supplierByName.set(partnerName, created.id);
          supplierId = created.id;
        }
      } else {
        agentId = agentByName.get(partnerName) ?? null;
        if (!agentId) {
          const created = await prisma.agent.create({
            data: { name: partnerName, sortOrder: await nextSortOrder("agent") },
          });
          agentByName.set(partnerName, created.id);
          agentId = created.id;
        }
      }
    }

    const creatorName = str(first, "Người tạo");
    const createdById = userByName.get(creatorName) ?? session.user.id;
    if (creatorName && !userByName.has(creatorName)) {
      summary.warnings.push(
        `Phiếu ${code}: không tìm thấy người tạo "${creatorName}", gán tạm cho tài khoản đang nhập`
      );
    }

    const items: {
      skuId: string;
      unitType: string;
      quantityInput: number;
      quantityUnits: number;
      matchedQuantity: boolean;
      matchedDebt: boolean;
    }[] = [];
    for (const row of rows) {
      const skuCode = str(row, "SKU");
      if (!skuByCode.has(skuCode)) {
        summary.warnings.push(`Phiếu ${code}: bỏ qua dòng vì không tìm thấy SKU "${skuCode}"`);
        continue;
      }
      items.push({
        skuId: skuCode,
        unitType: str(row, "Đơn vị") === "Thùng" ? "CASE" : "UNIT",
        quantityInput: num(row, "SL nhập"),
        quantityUnits: num(row, "SL quy đổi"),
        matchedQuantity: truthy(row["Khớp SL"]),
        matchedDebt: truthy(row["Khớp CN"]),
      });
    }
    if (items.length === 0) continue;

    // items[].skuId currently holds the sku code — resolve to real ids.
    const skuIdByCode = new Map(
      (
        await prisma.sku.findMany({
          where: { code: { in: items.map((i) => i.skuId) } },
          select: { id: true, code: true },
        })
      ).map((s) => [s.code, s.id])
    );

    await prisma.transaction.create({
      data: {
        code,
        type,
        date,
        supplierId,
        agentId,
        note: str(first, "Ghi chú") || null,
        createdById,
        paidDebt: truthy(first["Đã TT công nợ"]),
        receivedWarehouse: truthy(first["Nhập kho"]),
        goodsShipped: truthy(first["Đã xuất hàng"]),
        paid: truthy(first["Đã thanh toán"]),
        settled: truthy(first["Tất toán"]),
        items: {
          create: items
            .filter((i) => skuIdByCode.has(i.skuId))
            .map((i) => ({
              skuId: skuIdByCode.get(i.skuId)!,
              unitType: i.unitType,
              quantityInput: i.quantityInput,
              quantityUnits: i.quantityUnits,
              matchedQuantity: i.matchedQuantity,
              matchedDebt: i.matchedDebt,
            })),
        },
      },
    });
    summary.transactions.created++;
  }

  // --- Phiếu nhập hàng Trung ---
  const ciRows = sheetRows(wb, "Nhap hang Trung");
  const ciGroups = groupBy(ciRows, (r) => str(r, "Mã phiếu"));
  for (const [code, rows] of ciGroups) {
    if (!code) continue;
    if (await prisma.chinaImport.findUnique({ where: { code } })) {
      summary.chinaImports.skipped++;
      continue;
    }
    const first = rows[0];
    const date = parseViDateTime(str(first, "Ngày")) ?? new Date();
    const creatorName = str(first, "Người tạo");
    const createdById = userByName.get(creatorName) ?? session.user.id;

    await prisma.chinaImport.create({
      data: {
        code,
        date,
        note: str(first, "Ghi chú phiếu") || null,
        createdById,
        items: {
          create: rows
            .filter((r) => str(r, "Tên hàng"))
            .map((r) => ({
              itemName: str(r, "Tên hàng"),
              quantity: num(r, "Số lượng"),
              note: str(r, "Ghi chú dòng") || null,
            })),
        },
      },
    });
    summary.chinaImports.created++;
  }

  // --- Hàng cần order (không có mã định danh -> luôn thêm mới) ---
  for (const row of sheetRows(wb, "Hang can order")) {
    const itemName = str(row, "Tên hàng");
    if (!itemName) continue;
    const creatorName = str(row, "Người thêm");
    const createdById = userByName.get(creatorName) ?? session.user.id;
    await prisma.chinaOrderItem.create({
      data: {
        itemName,
        quantity: num(row, "Số lượng"),
        note: str(row, "Ghi chú") || null,
        ordered: truthy(row["Đã order"]),
        createdById,
      },
    });
    summary.chinaOrderItems.created++;
  }

  revalidatePath("/cai-dat");
  revalidatePath("/nhap-hang");
  revalidatePath("/xuat-hang");
  revalidatePath("/nhap-hang-trung");

  return summary;
}
