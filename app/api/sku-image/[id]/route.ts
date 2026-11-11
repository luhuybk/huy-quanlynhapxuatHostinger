import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// Ảnh sản phẩm. URL luôn kèm ?v=<imageUpdatedAt> (xem skuImageUrl), nên mỗi
// phiên bản ảnh có một địa chỉ riêng và cho trình duyệt giữ lâu được.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const image = await prisma.skuImage.findUnique({ where: { skuId: id } });
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
