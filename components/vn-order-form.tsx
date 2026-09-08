"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { SkuPicker, type SkuOption } from "@/components/sku-picker";
import { createVnOrder, updateVnOrder } from "@/lib/actions/vn-orders";
import { toDateInputValue } from "@/lib/date-input";

type Row = {
  rowId: string;
  skuId: string | null;
  itemName: string;
  quantity: number;
  note: string;
};

type Brand = { id: string; name: string };

export type EditableVnOrder = {
  id: string;
  date: Date | string;
  brandId: string;
  note: string | null;
  ordered: boolean;
  arrived: boolean;
  items: { skuId: string | null; itemName: string; quantity: number; note: string | null }[];
};

function emptyRow(): Row {
  return { rowId: crypto.randomUUID(), skuId: null, itemName: "", quantity: 1, note: "" };
}

function rowsFromOrder(o: EditableVnOrder): Row[] {
  return o.items.map((it) => ({
    rowId: crypto.randomUUID(),
    skuId: it.skuId,
    itemName: it.itemName,
    quantity: it.quantity,
    note: it.note ?? "",
  }));
}

export function VnOrderForm({
  brands,
  skus,
  editingOrder,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger,
}: {
  brands: Brand[];
  skus: SkuOption[];
  editingOrder?: EditableVnOrder;
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
    editingOrder ? toDateInputValue(editingOrder.date) : toDateInputValue()
  );
  const [brandId, setBrandId] = useState(editingOrder?.brandId ?? "");
  const [note, setNote] = useState(editingOrder?.note ?? "");
  const [ordered, setOrdered] = useState(editingOrder?.ordered ?? false);
  const [arrived, setArrived] = useState(editingOrder?.arrived ?? false);
  const [rows, setRows] = useState<Row[]>(() =>
    editingOrder ? rowsFromOrder(editingOrder) : [emptyRow()]
  );

  // Cả đợt thuộc 1 brand, nên ô chọn sản phẩm chỉ gợi ý SKU của brand đó.
  const brandSkus = brandId ? skus.filter((s) => s.brandId === brandId) : skus;

  function updateRow(rowId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function resetForm() {
    setDate(toDateInputValue());
    setBrandId("");
    setNote("");
    setOrdered(false);
    setArrived(false);
    setRows([emptyRow()]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!brandId) {
      toast.error("Vui lòng chọn brand cho đợt order");
      return;
    }
    if (rows.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 mặt hàng");
      return;
    }
    for (const r of rows) {
      if (!r.itemName.trim()) {
        toast.error("Vui lòng chọn/nhập tên hàng cho tất cả các dòng");
        return;
      }
      if (!r.quantity || r.quantity <= 0) {
        toast.error(`Số lượng không hợp lệ cho "${r.itemName}"`);
        return;
      }
    }

    const formData = new FormData();
    formData.set("date", date);
    formData.set("brandId", brandId);
    formData.set("note", note);
    if (ordered) formData.set("ordered", "on");
    if (arrived) formData.set("arrived", "on");
    formData.set(
      "items",
      JSON.stringify(
        rows.map((r) => ({
          skuId: r.skuId,
          itemName: r.itemName,
          quantity: Number(r.quantity),
          note: r.note,
        }))
      )
    );

    startTransition(async () => {
      try {
        if (editingOrder) {
          await updateVnOrder(editingOrder.id, formData);
        } else {
          await createVnOrder(formData);
        }
        toast.success(editingOrder ? "Đã cập nhật đợt order" : "Đã lưu đợt order");
        setOpen(false);
        if (!editingOrder) resetForm();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  // Các ô nhập của một dòng hàng, dùng chung cho thẻ (điện thoại) và bảng
  // (máy tính) để hai giao diện không lệch nhau.
  const skuField = (r: Row) => (
    <SkuPicker
      skus={brandSkus}
      value={{ skuId: r.skuId, skuName: r.itemName, brandId }}
      onSelect={(v) => updateRow(r.rowId, { skuId: v.skuId, itemName: v.skuName })}
    />
  );

  const qtyField = (r: Row) => (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      value={r.quantity}
      onChange={(e) => updateRow(r.rowId, { quantity: Number(e.target.value) })}
    />
  );

  const noteField = (r: Row) => (
    <Input
      value={r.note}
      placeholder="Ghi chú (không bắt buộc)"
      onChange={(e) => updateRow(r.rowId, { note: e.target.value })}
    />
  );

  const removeButton = (r: Row) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => removeRow(r.rowId)}
      disabled={rows.length === 1}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> Đợt order mới
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingOrder ? "Sửa đợt order" : "Đợt order"} hàng Việt Nam
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4">
          {/* Chỉ phần này cuộn, để nút lưu luôn nằm sẵn phía dưới. */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="vn-date">Ngày</Label>
                <Input
                  id="vn-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Brand</Label>
                <Select
                  value={brandId}
                  onValueChange={(v) => {
                    setBrandId(v);
                    // Đổi brand thì bỏ liên kết SKU cũ, giữ lại tên hàng đã gõ.
                    setRows((prev) => prev.map((r) => ({ ...r, skuId: null })));
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Chọn brand cần order" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vn-ordered"
                  checked={ordered}
                  onCheckedChange={(c) => setOrdered(c === true)}
                />
                <Label htmlFor="vn-ordered" className="font-normal">
                  Đã đặt
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="vn-arrived"
                  checked={arrived}
                  onCheckedChange={(c) => setArrived(c === true)}
                />
                <Label htmlFor="vn-arrived" className="font-normal">
                  Đã về
                </Label>
              </div>
            </div>

            {/* Điện thoại: mỗi món là một thẻ, khỏi phải kéo ngang. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {rows.map((r, i) => (
                <div key={r.rowId} className="flex flex-col gap-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Món {i + 1}</span>
                    {removeButton(r)}
                  </div>
                  {skuField(r)}
                  <div className="flex flex-col gap-1.5">
                    <Label>Số lượng</Label>
                    {qtyField(r)}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Ghi chú</Label>
                    {noteField(r)}
                  </div>
                </div>
              ))}
            </div>

            {/* Máy tính: giữ dạng bảng cho nhập liệu nhanh. */}
            <div className="hidden overflow-x-auto sm:block">
              <Table className="min-w-[620px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-64">Sản phẩm</TableHead>
                    <TableHead className="w-24">Số lượng</TableHead>
                    <TableHead>Ghi chú</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowId}>
                      <TableCell>{skuField(r)}</TableCell>
                      <TableCell>{qtyField(r)}</TableCell>
                      <TableCell>{noteField(r)}</TableCell>
                      <TableCell>{removeButton(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-fit"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus className="h-4 w-4" /> Thêm dòng hàng
            </Button>

            <div className="flex flex-col gap-2">
              <Label htmlFor="vn-note">Ghi chú</Label>
              <Textarea
                id="vn-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu đợt order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
