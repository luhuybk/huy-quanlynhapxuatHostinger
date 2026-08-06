"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  updateItemFlags,
  updateTransactionFlags,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { TransactionForm, type EditableTransaction } from "@/components/transaction-form";
import type { SkuOption } from "@/components/sku-picker";

type Role = "ADMIN" | "SHARED";

type TransactionListItem = {
  id: string;
  code: string;
  date: Date;
  note: string | null;
  supplier: { name: string } | null;
  agent: { name: string } | null;
  createdBy: { name: string };
  paidDebt: boolean;
  goodsShipped: boolean;
  paid: boolean;
  settled: boolean;
  items: {
    id: string;
    unitType: string;
    quantityInput: number;
    quantityUnits: number;
    matchedQuantity: boolean;
    matchedDebt: boolean;
    sku: { id: string; name: string; code: string; brandId: string; unitsPerCase: number; brand: { name: string } };
  }[];
};

type Brand = { id: string; name: string };
type Partner = { id: string; name: string };

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN");
}

function partnerName(t: TransactionListItem) {
  return t.supplier?.name ?? t.agent?.name ?? "";
}

function MatchSummary({
  items,
  field,
}: {
  items: TransactionListItem["items"];
  field: "matchedQuantity" | "matchedDebt";
}) {
  const matched = items.filter((i) => i[field]).length;
  const total = items.length;
  const allMatched = matched === total;
  return (
    <Badge variant={allMatched ? "secondary" : "outline"}>
      {matched}/{total}
    </Badge>
  );
}

export function TransactionList({
  type,
  role,
  transactions,
  suppliers,
  agents,
  brands,
  skus,
}: {
  type: "IMPORT" | "EXPORT";
  role: Role;
  transactions: TransactionListItem[];
  suppliers?: Partner[];
  agents?: Partner[];
  brands: Brand[];
  skus: SkuOption[];
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Derived from the (possibly refreshed) transactions prop so toggling a
  // checkbox in the dialog reflects the latest state without closing it.
  const detail = transactions.find((t) => t.id === detailId) ?? null;
  const editing = transactions.find((t) => t.id === editingId) ?? null;

  function toggleFlag(
    itemId: string,
    key: "matchedQuantity" | "matchedDebt",
    currentValue: boolean
  ) {
    startTransition(async () => {
      try {
        await updateItemFlags(itemId, type, { [key]: !currentValue });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể cập nhật");
      }
    });
  }

  function toggleHeaderFlag(
    id: string,
    key: "paidDebt" | "goodsShipped" | "paid" | "settled",
    currentValue: boolean
  ) {
    startTransition(async () => {
      try {
        await updateTransactionFlags(id, type, { [key]: !currentValue });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể cập nhật");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success("Đã xoá phiếu");
        setDetailId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể xoá phiếu");
      }
    });
  }

  const editableTransaction: EditableTransaction | undefined = editing
    ? {
        id: editing.id,
        date: editing.date,
        partnerId:
          type === "IMPORT"
            ? suppliers?.find((s) => s.name === editing.supplier?.name)?.id ?? ""
            : agents?.find((a) => a.name === editing.agent?.name)?.id ?? "",
        note: editing.note,
        paidDebt: editing.paidDebt,
        goodsShipped: editing.goodsShipped,
        paid: editing.paid,
        settled: editing.settled,
        items: editing.items.map((it) => ({
          skuId: it.sku.id,
          skuName: it.sku.name,
          brandId: it.sku.brandId,
          unitsPerCase: it.sku.unitsPerCase,
          unitType: it.unitType as "CASE" | "UNIT",
          quantityInput: it.quantityInput,
          matchedQuantity: it.matchedQuantity,
          matchedDebt: it.matchedDebt,
        })),
      }
    : undefined;

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Mã phiếu</TableHead>
              <TableHead>{type === "IMPORT" ? "Đối tác" : "Đại lý"}</TableHead>
              <TableHead>Số SKU</TableHead>
              {type === "IMPORT" ? (
                <>
                  <TableHead>Khớp SL</TableHead>
                  <TableHead>Khớp công nợ</TableHead>
                  <TableHead>Đã TT CN</TableHead>
                </>
              ) : (
                <>
                  <TableHead>Đã xuất</TableHead>
                  <TableHead>Đã TT</TableHead>
                  <TableHead>Tất toán</TableHead>
                </>
              )}
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow
                key={t.id}
                className="cursor-pointer"
                onClick={() => setDetailId(t.id)}
              >
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell className="font-mono text-xs">{t.code}</TableCell>
                <TableCell>{partnerName(t)}</TableCell>
                <TableCell>{t.items.length}</TableCell>
                {type === "IMPORT" ? (
                  <>
                    <TableCell>
                      <MatchSummary items={t.items} field="matchedQuantity" />
                    </TableCell>
                    <TableCell>
                      <MatchSummary items={t.items} field="matchedDebt" />
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.paidDebt ? "secondary" : "outline"}>
                        {t.paidDebt ? "Đã TT" : "Chưa"}
                      </Badge>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <Badge variant={t.goodsShipped ? "secondary" : "outline"}>
                        {t.goodsShipped ? "Đã xuất" : "Chưa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.paid ? "secondary" : "outline"}>
                        {t.paid ? "Đã TT" : "Chưa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.settled ? "secondary" : "outline"}>
                        {t.settled ? "Tất toán" : "Chưa"}
                      </Badge>
                    </TableCell>
                  </>
                )}
                {isAdmin && (
                  <TableCell
                    className="flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingId(t.id)}
                    >
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
            {transactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground"
                >
                  Không có phiếu nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết phiếu {detail?.code}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <p className="break-words">
                  <span className="text-muted-foreground">Ngày: </span>
                  {formatDate(detail.date)}
                </p>
                <p className="break-words">
                  <span className="text-muted-foreground">
                    {type === "IMPORT" ? "Đối tác" : "Đại lý"}:{" "}
                  </span>
                  {partnerName(detail)}
                </p>
                <p className="break-words">
                  <span className="text-muted-foreground">Người tạo: </span>
                  {detail.createdBy.name}
                </p>
              </div>

              {type === "IMPORT" ? (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={detail.paidDebt}
                    disabled={isPending || !isAdmin}
                    onCheckedChange={() =>
                      toggleHeaderFlag(detail.id, "paidDebt", detail.paidDebt)
                    }
                  />
                  <span className="text-sm">Đã TT Công nợ</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.goodsShipped}
                      disabled={isPending}
                      onCheckedChange={() =>
                        toggleHeaderFlag(
                          detail.id,
                          "goodsShipped",
                          detail.goodsShipped
                        )
                      }
                    />
                    <span className="text-sm">Đã xuất hàng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.paid}
                      disabled={isPending || !isAdmin}
                      onCheckedChange={() =>
                        toggleHeaderFlag(detail.id, "paid", detail.paid)
                      }
                    />
                    <span className="text-sm">Đã thanh toán</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.settled}
                      disabled={isPending || !isAdmin}
                      onCheckedChange={() =>
                        toggleHeaderFlag(detail.id, "settled", detail.settled)
                      }
                    />
                    <span className="text-sm">Tất toán</span>
                  </div>
                </div>
              )}

              <div className="-mx-4 overflow-x-auto px-4">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Quy đổi</TableHead>
                      {type === "IMPORT" && (
                        <>
                          <TableHead className="text-center">Khớp SL</TableHead>
                          <TableHead className="text-center">Khớp CN</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.sku.name}</TableCell>
                        <TableCell>{it.sku.brand.name}</TableCell>
                        <TableCell>
                          {it.unitType === "CASE" ? "Thùng" : "Lẻ"}
                        </TableCell>
                        <TableCell>{it.quantityInput}</TableCell>
                        <TableCell>{it.quantityUnits} sp</TableCell>
                        {type === "IMPORT" && (
                          <>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={it.matchedQuantity}
                                disabled={isPending}
                                onCheckedChange={() =>
                                  toggleFlag(it.id, "matchedQuantity", it.matchedQuantity)
                                }
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={it.matchedDebt}
                                disabled={isPending || !isAdmin}
                                onCheckedChange={() =>
                                  toggleFlag(it.id, "matchedDebt", it.matchedDebt)
                                }
                              />
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {detail.note && (
                <p className="text-sm text-muted-foreground">
                  Ghi chú: {detail.note}
                </p>
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

      {editableTransaction && (
        <TransactionForm
          type={type}
          role={role}
          suppliers={suppliers}
          agents={agents}
          brands={brands}
          skus={skus}
          editingTransaction={editableTransaction}
          open={!!editing}
          onOpenChange={(o) => !o && setEditingId(null)}
          hideTrigger
        />
      )}
    </>
  );
}
