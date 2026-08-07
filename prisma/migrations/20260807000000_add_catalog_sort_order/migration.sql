-- CreateSequence
CREATE SEQUENCE "Supplier_sortOrder_seq" AS integer;
CREATE SEQUENCE "Agent_sortOrder_seq" AS integer;
CREATE SEQUENCE "Brand_sortOrder_seq" AS integer;
CREATE SEQUENCE "Sku_sortOrder_seq" AS integer;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT nextval('"Supplier_sortOrder_seq"');
ALTER TABLE "Agent" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT nextval('"Agent_sortOrder_seq"');
ALTER TABLE "Brand" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT nextval('"Brand_sortOrder_seq"');
ALTER TABLE "Sku" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT nextval('"Sku_sortOrder_seq"');

-- Backfill existing rows in current (alphabetical) order so the first
-- reorder starts from what users already see, not an arbitrary DB order.
UPDATE "Supplier" SET "sortOrder" = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY name ASC) AS rn FROM "Supplier") sub
WHERE "Supplier".id = sub.id;

UPDATE "Agent" SET "sortOrder" = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY name ASC) AS rn FROM "Agent") sub
WHERE "Agent".id = sub.id;

UPDATE "Brand" SET "sortOrder" = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY name ASC) AS rn FROM "Brand") sub
WHERE "Brand".id = sub.id;

UPDATE "Sku" SET "sortOrder" = sub.rn
FROM (SELECT id, row_number() OVER (ORDER BY name ASC) AS rn FROM "Sku") sub
WHERE "Sku".id = sub.id;

-- SetSequenceOwnership
ALTER SEQUENCE "Supplier_sortOrder_seq" OWNED BY "Supplier"."sortOrder";
ALTER SEQUENCE "Agent_sortOrder_seq" OWNED BY "Agent"."sortOrder";
ALTER SEQUENCE "Brand_sortOrder_seq" OWNED BY "Brand"."sortOrder";
ALTER SEQUENCE "Sku_sortOrder_seq" OWNED BY "Sku"."sortOrder";

-- Advance sequences past the backfilled max so new rows keep appending at the end
SELECT setval('"Supplier_sortOrder_seq"', COALESCE((SELECT MAX("sortOrder") FROM "Supplier"), 1));
SELECT setval('"Agent_sortOrder_seq"', COALESCE((SELECT MAX("sortOrder") FROM "Agent"), 1));
SELECT setval('"Brand_sortOrder_seq"', COALESCE((SELECT MAX("sortOrder") FROM "Brand"), 1));
SELECT setval('"Sku_sortOrder_seq"', COALESCE((SELECT MAX("sortOrder") FROM "Sku"), 1));
