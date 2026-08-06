"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { deleteChinaImport } from "@/lib/actions/china-imports";
import { ChinaImportForm, type EditableChinaImport } from "@/components/china-import-form";

type Role = "ADMIN" | "SHARED";

type ChinaImportListItem = {
  id: string;
  code: string;
  date: Date;
  note: string | null;
  createdBy: { name: string };
  items: { id: string; itemName: string; quantity: number; note: string | null }[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN");
}

export function ChinaImportList({
  role,
  imports,
}: {
  role: Role;
  imports: ChinaImportListItem[];
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const detail = imports.find((t) => t.id === detailId) ?? null;
  const editing = imports.find((t) => t.id === editingId) ?? null;

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteChinaImport(id);
        toast.success("Đã xoá phiếu");
        setDetailId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể xoá phiếu");
      }
    });
  }

  const editableImport: EditableChinaImport | undefined = editing
    ? {
        id: editing.id,
        date: editing.date,
        note: editing.note,
        items: editing.items.map((it) => ({ itemName: it.itemName, quantity: it.quantity })),
      }
    : undefined;

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>Số mặt hàng</TableHead>
              <TableHead>Người tạo</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetailId(t.id)}>
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell className="font-mono text-xs">{t.code}</TableCell>
                <TableCell>{t.items.length}</TableCell>
                <TableCell>{t.createdBy.name}</TableCell>
                {isAdmin && (
                  <TableCell className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(t.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {imports.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Không có phiếu nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu {detail?.code}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p className="break-words">
                  <span className="text-muted-foreground">Ngày: </span>
                  {formatDate(detail.date)}
                </p>
                <p className="break-words">
                  <span className="text-muted-foreground">Người tạo: </span>
                  {detail.createdBy.name}
                </p>
              </div>

              <div className="-mx-4 overflow-x-auto px-4">
                <Table className="min-w-[420px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên hàng</TableHead>
                      <TableHead>Số lượng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.itemName}</TableCell>
                        <TableCell>{it.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {detail.note && (
                <p className="text-sm text-muted-foreground">Ghi chú: {detail.note}</p>
              )}
              {isAdmin && (
                <Button
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    setEditingId(detail.id);
                    setDetailId(null);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Sửa phiếu
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editableImport && (
        <ChinaImportForm
          editingImport={editableImport}
          open={!!editing}
          onOpenChange={(o) => !o && setEditingId(null)}
          hideTrigger
        />
      )}
    </>
  );
}
