"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { importBackup, type ImportSummary } from "@/lib/actions/import-backup";
import { importBackupJson, type ImportJsonSummary } from "@/lib/actions/import-backup-json";

export function ImportBackupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [xlsxSummary, setXlsxSummary] = useState<ImportSummary | null>(null);
  const [jsonSummary, setJsonSummary] = useState<ImportJsonSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn file backup (.xlsx hoặc .json)");
      return;
    }
    const isJson = file.name.toLowerCase().endsWith(".json");
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        if (isJson) {
          const result = await importBackupJson(formData);
          setJsonSummary(result);
        } else {
          const result = await importBackup(formData);
          setXlsxSummary(result);
        }
        toast.success("Đã nhập dữ liệu backup");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  const summary = xlsxSummary ?? jsonSummary;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setXlsxSummary(null);
          setJsonSummary(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Nhập dữ liệu backup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nhập dữ liệu backup</DialogTitle>
        </DialogHeader>

        {!summary ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Chọn file từ nút &quot;Xuất backup đầy đủ (.json)&quot; — khôi phục chính
              xác, giữ nguyên mật khẩu và chủ sở hữu đại lý — hoặc file &quot;Xuất dữ liệu
              backup (.xlsx)&quot; cũ hơn (không giữ mật khẩu, người dùng mới sẽ được cấp
              mật khẩu tạm). Dữ liệu đã tồn tại sẽ được cập nhật/bỏ qua, không tạo trùng.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="backup-file">File backup (.json hoặc .xlsx)</Label>
              <Input
                id="backup-file"
                type="file"
                accept=".xlsx,.json"
                ref={fileRef}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang nhập..." : "Nhập dữ liệu"}
              </Button>
            </DialogFooter>
          </form>
        ) : jsonSummary ? (
          <div className="flex flex-col gap-4 text-sm">
            <ul className="flex flex-col gap-1">
              <li>Người dùng: {jsonSummary.users}</li>
              <li>Brand: {jsonSummary.brands}</li>
              <li>Đối tác: {jsonSummary.suppliers}</li>
              <li>Đại lý: {jsonSummary.agents}</li>
              <li>SKU: {jsonSummary.skus}</li>
              <li>Phiếu nhập/xuất: {jsonSummary.transactions}</li>
              <li>Phiếu nhập hàng Trung: {jsonSummary.chinaImports}</li>
              <li>Hàng Trung cần order: {jsonSummary.chinaOrderItems}</li>
              <li>Đợt order hàng VN: {jsonSummary.vnOrders}</li>
              <li>
                Kho: {jsonSummary.warehouses} · Khu vực: {jsonSummary.zones}
              </li>
            </ul>
            {jsonSummary.warnings.length > 0 && (
              <div className="rounded-md border border-destructive/50 p-3">
                <p className="mb-2 font-medium">Cảnh báo:</p>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
                  {jsonSummary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Đóng</Button>
            </DialogFooter>
          </div>
        ) : xlsxSummary ? (
          <div className="flex flex-col gap-4 text-sm">
            <ul className="flex flex-col gap-1">
              <li>
                Brand: +{xlsxSummary.brands.created} mới, {xlsxSummary.brands.matched} đã có
              </li>
              <li>
                Đối tác: +{xlsxSummary.suppliers.created} mới, {xlsxSummary.suppliers.matched}{" "}
                đã có
              </li>
              <li>
                Đại lý: +{xlsxSummary.agents.created} mới, {xlsxSummary.agents.matched} đã có
              </li>
              <li>
                SKU: +{xlsxSummary.skus.created} mới, {xlsxSummary.skus.updated} cập nhật
              </li>
              <li>
                Người dùng: +{xlsxSummary.users.created} mới, {xlsxSummary.users.skipped} bỏ
                qua (đã tồn tại)
              </li>
              <li>
                Phiếu nhập/xuất: +{xlsxSummary.transactions.created} mới,{" "}
                {xlsxSummary.transactions.skipped} bỏ qua (đã tồn tại)
              </li>
              <li>
                Phiếu nhập hàng Trung: +{xlsxSummary.chinaImports.created} mới,{" "}
                {xlsxSummary.chinaImports.skipped} bỏ qua (đã tồn tại)
              </li>
              <li>
                Hàng Trung cần order: +{xlsxSummary.chinaOrderItems.created} mới,{" "}
                {xlsxSummary.chinaOrderItems.skipped} bỏ qua (đã tồn tại)
              </li>
              <li>
                Đợt order hàng VN: +{xlsxSummary.vnOrders.created} mới,{" "}
                {xlsxSummary.vnOrders.skipped} bỏ qua (đã tồn tại)
              </li>
            </ul>

            {xlsxSummary.users.tempPasswords.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">
                  Mật khẩu tạm cho tài khoản mới (đổi lại sau khi đăng nhập):
                </p>
                <ul className="flex flex-col gap-1 font-mono text-xs">
                  {xlsxSummary.users.tempPasswords.map((u) => (
                    <li key={u.email}>
                      {u.email}: {u.password}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {xlsxSummary.warnings.length > 0 && (
              <div className="rounded-md border border-destructive/50 p-3">
                <p className="mb-2 font-medium">Cảnh báo:</p>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
                  {xlsxSummary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Đóng</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
