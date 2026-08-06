"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { createChinaImport, updateChinaImport } from "@/lib/actions/china-imports";

type Row = {
  rowId: string;
  itemName: string;
  quantity: number;
};

export type EditableChinaImport = {
  id: string;
  date: Date | string;
  note: string | null;
  items: { itemName: string; quantity: number }[];
};

function emptyRow(): Row {
  return { rowId: crypto.randomUUID(), itemName: "", quantity: 1 };
}

function rowsFromImport(t: EditableChinaImport): Row[] {
  return t.items.map((it) => ({
    rowId: crypto.randomUUID(),
    itemName: it.itemName,
    quantity: it.quantity,
  }));
}

function toDateInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function ChinaImportForm({
  editingImport,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger,
}: {
  editingImport?: EditableChinaImport;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(() =>
    editingImport ? toDateInputValue(editingImport.date) : new Date().toISOString().slice(0, 10)
  );
  const [note, setNote] = useState(editingImport?.note ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    editingImport ? rowsFromImport(editingImport) : [emptyRow()]
  );

  function updateRow(rowId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function resetForm() {
    if (editingImport) {
      setDate(toDateInputValue(editingImport.date));
      setNote(editingImport.note ?? "");
      setRows(rowsFromImport(editingImport));
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setRows([emptyRow()]);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rows.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 mặt hàng");
      return;
    }
    for (const r of rows) {
      if (!r.itemName.trim()) {
        toast.error("Vui lòng nhập tên hàng cho tất cả các dòng");
        return;
      }
      if (!r.quantity || r.quantity <= 0) {
        toast.error(`Số lượng không hợp lệ cho "${r.itemName}"`);
        return;
      }
    }

    const formData = new FormData();
    formData.set("date", date);
    formData.set("note", note);
    formData.set(
      "items",
      JSON.stringify(
        rows.map((r) => ({ itemName: r.itemName, quantity: Number(r.quantity) }))
      )
    );

    startTransition(async () => {
      try {
        if (editingImport) {
          await updateChinaImport(editingImport.id, formData);
        } else {
          await createChinaImport(formData);
        }
        toast.success(editingImport ? "Đã cập nhật phiếu" : "Đã lưu phiếu nhập hàng Trung");
        setOpen(false);
        if (!editingImport) resetForm();
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
        if (!o && !editingImport) resetForm();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> Nhập hàng Trung
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingImport ? "Sửa phiếu" : "Phiếu"} nhập hàng Trung</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Ngày</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="max-w-56"
            />
          </div>

          <div className="-mx-4 overflow-x-auto px-4">
            <Table className="min-w-[420px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Tên hàng</TableHead>
                  <TableHead className="w-28">Số lượng</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.rowId}>
                    <TableCell>
                      <Input
                        value={r.itemName}
                        placeholder="Tên hàng..."
                        onChange={(e) => updateRow(r.rowId, { itemName: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={r.quantity}
                        onChange={(e) =>
                          updateRow(r.rowId, { quantity: Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(r.rowId)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setRows((prev) => [...prev, emptyRow()])}
          >
            <Plus className="h-4 w-4" /> Thêm dòng hàng
          </Button>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu phiếu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
