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
import { createTransaction, updateTransaction } from "@/lib/actions/transactions";
import { toUnits } from "@/lib/units";

type Row = {
  rowId: string;
  skuId: string | null;
  skuName: string;
  brandId: string;
  unitsPerCase: number;
  unitType: "CASE" | "UNIT";
  quantityInput: number;
  matchedQuantity: boolean;
  matchedDebt: boolean;
};

type Brand = { id: string; name: string };
type Partner = { id: string; name: string };
type Role = "ADMIN" | "SHARED";

export type EditableTransaction = {
  id: string;
  date: Date | string;
  partnerId: string;
  note: string | null;
  paidDebt: boolean;
  goodsShipped: boolean;
  paid: boolean;
  settled: boolean;
  items: {
    skuId: string;
    skuName: string;
    brandId: string;
    unitsPerCase: number;
    unitType: "CASE" | "UNIT";
    quantityInput: number;
    matchedQuantity: boolean;
    matchedDebt: boolean;
  }[];
};

function emptyRow(): Row {
  return {
    rowId: crypto.randomUUID(),
    skuId: null,
    skuName: "",
    brandId: "",
    unitsPerCase: 1,
    unitType: "UNIT",
    quantityInput: 1,
    matchedQuantity: false,
    matchedDebt: false,
  };
}

function rowsFromTransaction(t: EditableTransaction): Row[] {
  return t.items.map((it) => ({
    rowId: crypto.randomUUID(),
    skuId: it.skuId,
    skuName: it.skuName,
    brandId: it.brandId,
    unitsPerCase: it.unitsPerCase,
    unitType: it.unitType,
    quantityInput: it.quantityInput,
    matchedQuantity: it.matchedQuantity,
    matchedDebt: it.matchedDebt,
  }));
}

function toDateInputValue(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

export function TransactionForm({
  type,
  role,
  suppliers,
  agents,
  brands,
  skus,
  editingTransaction,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  hideTrigger,
}: {
  type: "IMPORT" | "EXPORT";
  role: Role;
  suppliers?: Partner[];
  agents?: Partner[];
  brands: Brand[];
  skus: SkuOption[];
  editingTransaction?: EditableTransaction;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const partners = type === "IMPORT" ? suppliers ?? [] : agents ?? [];
  const partnerLabel = type === "IMPORT" ? "Đối tác" : "Đại lý";
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChangeProp ?? setInternalOpen;

  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(() =>
    editingTransaction
      ? toDateInputValue(editingTransaction.date)
      : new Date().toISOString().slice(0, 10)
  );
  const [partnerId, setPartnerId] = useState(
    editingTransaction?.partnerId ?? ""
  );
  const [note, setNote] = useState(editingTransaction?.note ?? "");
  const [rows, setRows] = useState<Row[]>(() =>
    editingTransaction ? rowsFromTransaction(editingTransaction) : [emptyRow()]
  );
  const [paidDebt, setPaidDebt] = useState(editingTransaction?.paidDebt ?? false);
  const [goodsShipped, setGoodsShipped] = useState(
    editingTransaction?.goodsShipped ?? false
  );
  const [paid, setPaid] = useState(editingTransaction?.paid ?? false);
  const [settled, setSettled] = useState(editingTransaction?.settled ?? false);

  const label = type === "IMPORT" ? "Nhập hàng" : "Xuất hàng";

  function updateRow(rowId: string, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r))
    );
  }

  function removeRow(rowId: string) {
    setRows((prev) => prev.filter((r) => r.rowId !== rowId));
  }

  function resetForm() {
    if (editingTransaction) {
      setDate(toDateInputValue(editingTransaction.date));
      setPartnerId(editingTransaction.partnerId);
      setNote(editingTransaction.note ?? "");
      setRows(rowsFromTransaction(editingTransaction));
      setPaidDebt(editingTransaction.paidDebt);
      setGoodsShipped(editingTransaction.goodsShipped);
      setPaid(editingTransaction.paid);
      setSettled(editingTransaction.settled);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setPartnerId("");
      setNote("");
      setRows([emptyRow()]);
      setPaidDebt(false);
      setGoodsShipped(false);
      setPaid(false);
      setSettled(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!partnerId) {
      toast.error(`Vui lòng chọn ${partnerLabel.toLowerCase()}`);
      return;
    }
    if (rows.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }
    for (const r of rows) {
      if (!r.skuName.trim()) {
        toast.error("Vui lòng chọn sản phẩm cho tất cả các dòng");
        return;
      }
      if (!r.skuId && !r.brandId) {
        toast.error(`Vui lòng chọn brand cho sản phẩm mới "${r.skuName}"`);
        return;
      }
      if (!r.quantityInput || r.quantityInput <= 0) {
        toast.error(`Số lượng không hợp lệ cho "${r.skuName}"`);
        return;
      }
    }

    const formData = new FormData();
    formData.set("date", date);
    if (type === "IMPORT") formData.set("supplierId", partnerId);
    else formData.set("agentId", partnerId);
    formData.set("note", note);
    if (paidDebt) formData.set("paidDebt", "on");
    if (goodsShipped) formData.set("goodsShipped", "on");
    if (paid) formData.set("paid", "on");
    if (settled) formData.set("settled", "on");
    formData.set(
      "items",
      JSON.stringify(
        rows.map((r) => ({
          skuId: r.skuId,
          skuName: r.skuName,
          brandId: r.brandId,
          unitType: r.unitType,
          quantityInput: Number(r.quantityInput),
          matchedQuantity: r.matchedQuantity,
          matchedDebt: r.matchedDebt,
        }))
      )
    );

    startTransition(async () => {
      try {
        if (editingTransaction) {
          await updateTransaction(editingTransaction.id, type, formData);
        } else {
          await createTransaction(type, formData);
        }
        toast.success(
          editingTransaction
            ? `Đã cập nhật phiếu ${label.toLowerCase()}`
            : `Đã lưu phiếu ${label.toLowerCase()}`
        );
        setOpen(false);
        if (!editingTransaction) resetForm();
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
        if (!o && !editingTransaction) resetForm();
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" /> {label}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-1rem)] max-w-4xl flex-col overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {editingTransaction ? "Sửa phiếu" : "Phiếu"} {label.toLowerCase()}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Ngày</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{partnerLabel}</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Chọn ${partnerLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "IMPORT" ? (
            <div className="flex items-center gap-2">
              <Checkbox
                id="paidDebt"
                checked={paidDebt}
                disabled={!isAdmin}
                onCheckedChange={(c) => setPaidDebt(c === true)}
              />
              <Label htmlFor="paidDebt" className="font-normal">
                Đã TT Công nợ
              </Label>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="goodsShipped"
                  checked={goodsShipped}
                  onCheckedChange={(c) => setGoodsShipped(c === true)}
                />
                <Label htmlFor="goodsShipped" className="font-normal">
                  Đã xuất hàng
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="paid"
                  checked={paid}
                  disabled={!isAdmin}
                  onCheckedChange={(c) => setPaid(c === true)}
                />
                <Label htmlFor="paid" className="font-normal">
                  Đã thanh toán
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="settled"
                  checked={settled}
                  disabled={!isAdmin}
                  onCheckedChange={(c) => setSettled(c === true)}
                />
                <Label htmlFor="settled" className="font-normal">
                  Tất toán
                </Label>
              </div>
            </div>
          )}

          <div className="-mx-4 overflow-x-auto px-4">
            <Table className={type === "IMPORT" ? "min-w-[880px]" : "min-w-[720px]"}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Sản phẩm</TableHead>
                  <TableHead className="w-36">Brand</TableHead>
                  <TableHead className="w-24">Đơn vị</TableHead>
                  <TableHead className="w-20">Số lượng</TableHead>
                  <TableHead className="w-24">Quy đổi</TableHead>
                  {type === "IMPORT" && (
                    <>
                      <TableHead className="w-20 text-center">Khớp SL</TableHead>
                      <TableHead className="w-20 text-center">Khớp CN</TableHead>
                    </>
                  )}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.rowId}>
                    <TableCell>
                      <SkuPicker
                        skus={skus}
                        value={{
                          skuId: r.skuId,
                          skuName: r.skuName,
                          brandId: r.brandId,
                        }}
                        onSelect={(v) =>
                          updateRow(r.rowId, {
                            skuId: v.skuId,
                            skuName: v.skuName,
                            brandId: v.brandId,
                            unitsPerCase: v.unitsPerCase,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.brandId}
                        onValueChange={(v) => updateRow(r.rowId, { brandId: v })}
                        disabled={!!r.skuId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {brands.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.unitType}
                        onValueChange={(v) =>
                          updateRow(r.rowId, { unitType: v as "CASE" | "UNIT" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNIT">Lẻ</SelectItem>
                          <SelectItem value="CASE">Thùng</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={r.quantityInput}
                        onChange={(e) =>
                          updateRow(r.rowId, {
                            quantityInput: Number(e.target.value),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {toUnits(
                        r.quantityInput || 0,
                        r.unitType,
                        r.unitsPerCase
                      )}{" "}
                      sp
                    </TableCell>
                    {type === "IMPORT" && (
                      <>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={r.matchedQuantity}
                            onCheckedChange={(c) =>
                              updateRow(r.rowId, { matchedQuantity: c === true })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={r.matchedDebt}
                            disabled={!isAdmin}
                            onCheckedChange={(c) =>
                              updateRow(r.rowId, { matchedDebt: c === true })
                            }
                          />
                        </TableCell>
                      </>
                    )}
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
            <Plus className="h-4 w-4" /> Thêm dòng sản phẩm
          </Button>

          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
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
