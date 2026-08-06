import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash("Xuhuong@2026", 10);
  const chungPasswordHash = await bcrypt.hash("123456", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { passwordHash: adminPasswordHash, name: "Admin", role: "ADMIN" },
    create: {
      email: "admin@example.com",
      passwordHash: adminPasswordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { email: "chung@example.com" },
    update: { passwordHash: chungPasswordHash, name: "Chung", role: "SHARED" },
    create: {
      email: "chung@example.com",
      passwordHash: chungPasswordHash,
      name: "Chung",
      role: "SHARED",
    },
  });

  const supplier1 = await prisma.supplier.upsert({
    where: { id: "supplier-seed-1" },
    update: {},
    create: {
      id: "supplier-seed-1",
      name: "Công ty TNHH Thương mại ABC",
      note: "Nhà cung cấp chính",
    },
  });

  const supplier2 = await prisma.supplier.upsert({
    where: { id: "supplier-seed-2" },
    update: {},
    create: {
      id: "supplier-seed-2",
      name: "Nhà phân phối XYZ",
    },
  });

  const brand1 = await prisma.brand.upsert({
    where: { name: "Coca-Cola" },
    update: {},
    create: { name: "Coca-Cola" },
  });

  const brand2 = await prisma.brand.upsert({
    where: { name: "Vinamilk" },
    update: {},
    create: { name: "Vinamilk" },
  });

  await prisma.sku.upsert({
    where: { code: "COCA-0001" },
    update: {},
    create: {
      code: "COCA-0001",
      name: "Coca-Cola lon 330ml",
      brandId: brand1.id,
      unitsPerCase: 24,
      supplierId: supplier1.id,
      isQuickCreate: true,
    },
  });

  await prisma.sku.upsert({
    where: { code: "COCA-0002" },
    update: {},
    create: {
      code: "COCA-0002",
      name: "Coca-Cola chai 1.5L",
      brandId: brand1.id,
      unitsPerCase: 12,
      supplierId: supplier1.id,
      isQuickCreate: true,
    },
  });

  await prisma.sku.upsert({
    where: { code: "VNM-0001" },
    update: {},
    create: {
      code: "VNM-0001",
      name: "Sữa tươi Vinamilk 180ml",
      brandId: brand2.id,
      unitsPerCase: 50,
      supplierId: supplier2.id,
      isQuickCreate: true,
    },
  });

  console.log("Seed hoàn tất.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
