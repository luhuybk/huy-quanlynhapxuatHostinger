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

export function ImportBackupDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Vui lòng chọn file backup (.xlsx)");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      try {
        const result = await importBackup(formData);
        setSummary(result);
        toast.success("Đã nhập dữ liệu backup");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSummary(null);
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
              Chọn file .xlsx được tạo từ nút &quot;Xuất dữ liệu backup&quot;. Dữ liệu đã
              tồn tại (theo mã SKU/mã phiếu/email) sẽ được bỏ qua hoặc cập nhật, không tạo
              trùng. Người dùng mới sẽ được cấp mật khẩu tạm — cần đổi lại sau.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="backup-file">File backup (.xlsx)</Label>
              <Input id="backup-file" type="file" accept=".xlsx" ref={fileRef} required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang nhập..." : "Nhập dữ liệu"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-sm">
            <ul className="flex flex-col gap-1">
              <li>
                Brand: +{summary.brands.created} mới, {summary.brands.matched} đã có
              </li>
              <li>
                Đối tác: +{summary.suppliers.created} mới, {summary.suppliers.matched} đã có
              </li>
              <li>
                Đại lý: +{summary.agents.created} mới, {summary.agents.matched} đã có
              </li>
              <li>
                SKU: +{summary.skus.created} mới, {summary.skus.updated} cập nhật
              </li>
              <li>
                Người dùng: +{summary.users.created} mới, {summary.users.skipped} bỏ qua
                (đã tồn tại)
              </li>
              <li>
                Phiếu nhập/xuất: +{summary.transactions.created} mới,{" "}
                {summary.transactions.skipped} bỏ qua (đã tồn tại)
              </li>
              <li>
                Phiếu nhập hàng Trung: +{summary.chinaImports.created} mới,{" "}
                {summary.chinaImports.skipped} bỏ qua (đã tồn tại)
              </li>
              <li>Hàng cần order: +{summary.chinaOrderItems.created} mới</li>
            </ul>

            {summary.users.tempPasswords.length > 0 && (
              <div className="rounded-md border p-3">
                <p className="mb-2 font-medium">
                  Mật khẩu tạm cho tài khoản mới (đổi lại sau khi đăng nhập):
                </p>
                <ul className="flex flex-col gap-1 font-mono text-xs">
                  {summary.users.tempPasswords.map((u) => (
                    <li key={u.email}>
                      {u.email}: {u.password}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.warnings.length > 0 && (
              <div className="rounded-md border border-destructive/50 p-3">
                <p className="mb-2 font-medium">Cảnh báo:</p>
                <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-muted-foreground">
                  {summary.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Đóng</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
