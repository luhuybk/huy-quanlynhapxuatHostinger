-- CreateTable
CREATE TABLE "ChinaOrderItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "ordered" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChinaOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChinaOrderItem_ordered_idx" ON "ChinaOrderItem"("ordered");

-- AddForeignKey
ALTER TABLE "ChinaOrderItem" ADD CONSTRAINT "ChinaOrderItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
