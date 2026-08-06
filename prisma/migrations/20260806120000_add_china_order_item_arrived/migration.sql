-- AlterTable
ALTER TABLE "ChinaOrderItem" ADD COLUMN "arrived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ChinaOrderItem_arrived_idx" ON "ChinaOrderItem"("arrived");
