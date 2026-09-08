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
import { Pencil } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ListSummary, type SummaryStat } from "@/components/list-summary";
import { SortHeader } from "@/components/sort-header";
import {
  updateItemFlags,
  updateTransactionFlags,
  deleteTransaction,
} from "@/lib/actions/transactions";
import { TransactionForm, type EditableTransaction } from "@/components/transaction-form";
import type { SkuOption } from "@/components/sku-picker";

type Role = "ADMIN" | "SHARED" | "STAFF";

type TransactionListItem = {
  id: string;
  code: string;
  date: Date;
  note: string | null;
  supplier: { id: string; name: string } | null;
  agent: { id: string; name: string } | null;
  createdBy: { name: string };
  paidDebt: boolean;
  receivedWarehouse: boolean;
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
    <Badge variant={allMatched ? "success" : "outline"}>
      {matched}/{total}
    </Badge>
  );
}

function StatusBadge({
  done,
  doneLabel,
  pendingLabel = "Chưa",
}: {
  done: boolean;
  doneLabel: string;
  pendingLabel?: string;
}) {
  // Chỉ tô xanh khi đã xong; việc chưa xong để trung tính, nhìn cả bảng sẽ
  // thấy ngay dòng nào "thiếu màu xanh" thay vì cả cột rực lên một màu.
  return (
    <Badge variant={done ? "success" : "outline"}>
      {done ? doneLabel : pendingLabel}
    </Badge>
  );
}

// Số phiếu còn dang dở của danh sách đang xem. Các key lọc khớp với
// STATUS_FILTERS trong date-range-filter.tsx nên bấm vào là lọc được ngay.
function pendingStats(
  type: "IMPORT" | "EXPORT",
  transactions: TransactionListItem[]
): SummaryStat[] {
  return type === "IMPORT"
    ? [
        {
          label: "chưa nhập kho",
          count: transactions.filter((t) => !t.receivedWarehouse).length,
          filterKey: "receivedWarehouse",
          filterValue: "0",
        },
        {
          label: "chưa TT công nợ",
          count: transactions.filter((t) => !t.paidDebt).length,
          filterKey: "paidDebt",
          filterValue: "0",
        },
      ]
    : [
        {
          label: "chưa xuất",
          count: transactions.filter((t) => !t.goodsShipped).length,
          filterKey: "goodsShipped",
          filterValue: "0",
        },
        {
          label: "chưa thanh toán",
          count: transactions.filter((t) => !t.paid).length,
          filterKey: "paid",
          filterValue: "0",
        },
        {
          label: "chưa tất toán",
          count: transactions.filter((t) => !t.settled).length,
          filterKey: "settled",
          filterValue: "0",
        },
      ];
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
    key: "paidDebt" | "receivedWarehouse" | "goodsShipped" | "paid" | "settled",
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
        // Lấy thẳng id của đối tác/đại lý — tra theo tên sẽ chọn nhầm khi có
        // hai đối tác trùng tên, và làm mất liên kết nếu tên đã đổi.
        partnerId:
          (type === "IMPORT" ? editing.supplier?.id : editing.agent?.id) ?? "",
        note: editing.note,
        paidDebt: editing.paidDebt,
        receivedWarehouse: editing.receivedWarehouse,
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
      <ListSummary
        total={transactions.length}
        totalLabel="phiếu"
        stats={pendingStats(type, transactions)}
      />
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <Table
          className="min-w-[720px]"
          containerClassName="max-h-[calc(100vh-22rem)]"
        >
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortHeader field="date">Ngày</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="partner">
                  {type === "IMPORT" ? "Đối tác" : "Đại lý"}
                </SortHeader>
              </TableHead>
              <TableHead>Số SKU</TableHead>
              {type === "IMPORT" ? (
                <>
                  <TableHead>Khớp SL</TableHead>
                  <TableHead>Khớp công nợ</TableHead>
                  <TableHead>Nhập kho</TableHead>
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
                      <StatusBadge done={t.receivedWarehouse} doneLabel="Đã nhập" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge done={t.paidDebt} doneLabel="Đã TT" />
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <StatusBadge done={t.goodsShipped} doneLabel="Đã xuất" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge done={t.paid} doneLabel="Đã TT" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge done={t.settled} doneLabel="Tất toán" />
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
                    <ConfirmDeleteButton
                      disabled={isPending}
                      description={`Phiếu ${t.code} (${partnerName(t)}) sẽ bị xoá vĩnh viễn.`}
                      onConfirm={() => handleDelete(t.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {transactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={(type === "IMPORT" ? 7 : 6) + (isAdmin ? 1 : 0)}
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
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.receivedWarehouse}
                      disabled={isPending}
                      onCheckedChange={() =>
                        toggleHeaderFlag(
                          detail.id,
                          "receivedWarehouse",
                          detail.receivedWarehouse
                        )
                      }
                    />
                    <span>Nhập kho</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.paidDebt}
                      disabled={isPending || !isAdmin}
                      onCheckedChange={() =>
                        toggleHeaderFlag(detail.id, "paidDebt", detail.paidDebt)
                      }
                    />
                    <span>Đã TT Công nợ</span>
                  </div>
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
                    <span>Đã xuất hàng</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.paid}
                      disabled={isPending || !isAdmin}
                      onCheckedChange={() =>
                        toggleHeaderFlag(detail.id, "paid", detail.paid)
                      }
                    />
                    <span>Đã thanh toán</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={detail.settled}
                      disabled={isPending || !isAdmin}
                      onCheckedChange={() =>
                        toggleHeaderFlag(detail.id, "settled", detail.settled)
                      }
                    />
                    <span>Tất toán</span>
                  </div>
                </div>
              )}

              <div className="-mx-4 overflow-x-auto px-4">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sản phẩm</TableHead>
                      <TableHead>Số lượng</TableHead>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead>Quy đổi</TableHead>
                      <TableHead>Brand</TableHead>
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
                        <TableCell className="font-medium">{it.quantityInput}</TableCell>
                        <TableCell>
                          {it.unitType === "CASE" ? "Thùng" : "Lẻ"}
                        </TableCell>
                        <TableCell>{it.quantityUnits} sp</TableCell>
                        <TableCell>{it.sku.brand.name}</TableCell>
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
                <p className="text-muted-foreground">
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
