export const dynamic = 'force-dynamic';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { skuImageUrl } from "@/lib/sku-image";
import { Button } from "@/components/ui/button";
import { OrderCatalog, type CatalogSku } from "@/components/order-catalog";

export default async function OrderByPicturePage({
  searchParams,
}: {
  searchParams: Promise<{ brandId?: string }>;
}) {
  const { brandId } = await searchParams;
  const [brands, skus] = await Promise.all([
    prisma.brand.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.sku.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        size: true,
        brandId: true,
        unitsPerCase: true,
        imageUpdatedAt: true,
      },
    }),
  ]);

  const catalog: CatalogSku[] = skus.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    size: s.size,
    brandId: s.brandId,
    unitsPerCase: s.unitsPerCase,
    imageUrl: skuImageUrl(s),
  }));
  // Chỉ hiện brand có sản phẩm, kèm số mã để biết brand nào đã có ảnh.
  const brandList = brands
    .map((b) => ({ ...b, count: catalog.filter((s) => s.brandId === b.id).length }))
    .filter((b) => b.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/hang-can-order" aria-label="Quay lại Hàng cần order">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Order theo hình</h1>
        </div>
      </div>
      <OrderCatalog brands={brandList} skus={catalog} initialBrandId={brandId} />
    </div>
  );
}
