export const dynamic = 'force-dynamic';

import Link from "next/link";
import { ChevronRight, ClipboardList, PackageMinus, PackagePlus } from "lucide-react";
import { auth } from "@/auth";
import { getDashboard } from "@/lib/get-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Một dòng "việc đang chờ": bấm là mở thẳng danh sách đã lọc sẵn.
function StatRow({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
    >
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "text-xl font-semibold tabular-nums",
          count > 0 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
        )}
      >
        {count}
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

const LIST_LIMIT = 8;

// Danh sách theo đối tác / brand, mỗi dòng một đường tắt tới phiếu của họ.
// Dài quá thì chỉ hiện những người nhiều việc nhất, kèm lối xem hết.
function NameList({
  title,
  empty,
  rows,
  allHref,
}: {
  title: string;
  empty: string;
  rows: { key: string; href: string; name: string; detail: string }[];
  allHref: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col">
        {rows.length === 0 && <p className="py-2 text-muted-foreground">{empty}</p>}
        {rows.slice(0, LIST_LIMIT).map((r) => (
          <Link
            key={r.key}
            href={r.href}
            className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
            <span className="shrink-0 text-muted-foreground">{r.detail}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
        {rows.length > LIST_LIMIT && (
          <Link href={allHref} className="pt-2 text-muted-foreground underline-offset-4 hover:underline">
            Xem hết {rows.length} →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user.role ?? "SHARED";
  const viewer = session?.user && { id: session.user.id, role };
  const d = await getDashboard(viewer);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Tổng quan</h1>
        <p className="text-muted-foreground">
          Việc đang chờ xử lý — bấm vào dòng nào là mở đúng danh sách đó.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Hàng cần order
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <StatRow href="/hang-can-order?status=pending" label="Đợt VN chưa đặt" count={d.order.vnPending} />
            <StatRow href="/hang-can-order?status=ordered" label="Đợt VN đã đặt, chưa về" count={d.order.vnWaiting} />
            <StatRow href="/hang-can-order?tab=china" label="Hàng Trung chưa đặt" count={d.order.chinaPending} />
            <StatRow href="/hang-can-order?tab=china" label="Hàng Trung đã đặt, chưa về" count={d.order.chinaWaiting} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="h-4 w-4" /> Hàng về kho
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <StatRow href="/hang-ve-kho?receivedWarehouse=0" label="Phiếu chưa nhập kho" count={d.imports.notReceived} />
            <StatRow href="/hang-ve-kho?paidDebt=0" label="Phiếu chưa TT công nợ" count={d.imports.unpaid} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackageMinus className="h-4 w-4" /> Xuất hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col">
            <StatRow href="/xuat-hang?goodsShipped=0" label="Phiếu chưa xuất" count={d.exports.notShipped} />
            <StatRow href="/xuat-hang?paid=0" label="Phiếu chưa thanh toán" count={d.exports.unpaid} />
            <StatRow href="/xuat-hang?settled=0" label="Phiếu chưa tất toán" count={d.exports.unsettled} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NameList
          title="Order chờ gửi hãng"
          empty="Không còn đợt nào chưa đặt"
          allHref="/hang-can-order?status=pending"
          rows={d.pendingBrands.map((b) => ({
            key: b.id,
            href: `/hang-can-order?brandId=${b.id}&status=pending`,
            name: b.name,
            detail: `${b.items} món · ${b.orders} đợt`,
          }))}
        />
        <NameList
          title="Đại lý chưa thanh toán"
          empty="Đại lý đã thanh toán hết"
          allHref="/xuat-hang?paid=0&sort=partner&dir=asc"
          rows={d.unpaidAgents.map((a) => ({
            key: a.id,
            href: `/xuat-hang?partnerId=${a.id}&paid=0`,
            name: a.name,
            detail: `${a.count} phiếu`,
          }))}
        />
        <NameList
          title="Nợ nhà cung cấp"
          empty="Đã thanh toán công nợ hết"
          allHref="/hang-ve-kho?paidDebt=0&sort=partner&dir=asc"
          rows={d.unpaidSuppliers.map((s) => ({
            key: s.id,
            href: `/hang-ve-kho?partnerId=${s.id}&paidDebt=0`,
            name: s.name,
            detail: `${s.count} phiếu`,
          }))}
        />
      </div>
    </div>
  );
}
