export const dynamic = 'force-dynamic';

import { auth } from "@/auth";
import { getChinaImports } from "@/lib/get-china-imports";
import { ChinaImportForm } from "@/components/china-import-form";
import { ChinaImportList } from "@/components/china-import-list";

export default async function ChinaImportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const role = session?.user.role ?? "SHARED";

  const imports = await getChinaImports(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Nhập hàng Trung</h1>
        <ChinaImportForm />
      </div>
      <ChinaImportList role={role} imports={imports} />
    </div>
  );
}
