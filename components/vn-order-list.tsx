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
import { ListSummary } from "@/components/list-summary";
import { updateVnOrderFlags, deleteVnOrder } from "@/lib/actions/vn-orders";
import { VnOrderForm, type EditableVnOrder } from "@/components/vn-order-form";
import type { SkuOption } from "@/components/sku-picker";

type Role = "ADMIN" | "SHARED" | "STAFF";
type Brand = { id: string; name: string };

type VnOrderListItem = {
  id: string;
  code: string;
  date: Date;
  note: string | null;
  ordered: boolean;
  arrived: boolean;
  brand: { id: string; name: string };
  createdBy: { name: string };
  items: {
    id: string;
    skuId: string | null;
    itemName: string;
    quantity: number;
    note: string | null;
  }[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN");
}

export function VnOrderList({
  role,
  orders,
  brands,
  skus,
}: {
  role: Role;
  orders: VnOrderListItem[];
  brands: Brand[];
  skus: SkuOption[];
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [isPending, startTransition] = useTransition();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const detail = orders.find((o) => o.id === detailId) ?? null;
  const editing = orders.find((o) => o.id === editingId) ?? null;

  function toggleFlag(id: string, key: "ordered" | "arrived", currentValue: boolean) {
    startTransition(async () => {
      try {
        await updateVnOrderFlags(id, { [key]: !currentValue });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể cập nhật");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteVnOrder(id);
        toast.success("Đã xoá đợt order");
        setDetailId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể xoá");
      }
    });
  }

  const editableOrder: EditableVnOrder | undefined = editing
    ? {
        id: editing.id,
        date: editing.date,
        brandId: editing.brand.id,
        note: editing.note,
        ordered: editing.ordered,
        arrived: editing.arrived,
        items: editing.items.map((it) => ({
          skuId: it.skuId,
          itemName: it.itemName,
          quantity: it.quantity,
          note: it.note,
        })),
      }
    : undefined;

  return (
    <>
      <ListSummary
        total={orders.length}
        totalLabel="đợt"
        stats={[
          {
            label: "chưa đặt",
            count: orders.filter((o) => !o.ordered).length,
            filterKey: "status",
            filterValue: "pending",
          },
          {
            label: "đã đặt chưa về",
            count: orders.filter((o) => o.ordered && !o.arrived).length,
            filterKey: "status",
            filterValue: "ordered",
          },
        ]}
      />
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <Table
          className="min-w-[680px]"
          containerClassName="max-h-[calc(100vh-22rem)]"
        >
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Số món</TableHead>
              <TableHead>Tổng SL</TableHead>
              <TableHead>Đã đặt</TableHead>
              <TableHead>Đã về</TableHead>
              <TableHead>Người tạo</TableHead>
              {isAdmin && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow
                key={o.id}
                className={o.arrived ? "cursor-pointer opacity-60" : "cursor-pointer"}
                onClick={() => setDetailId(o.id)}
              >
                <TableCell>{formatDate(o.date)}</TableCell>
                <TableCell className="font-medium">{o.brand.name}</TableCell>
                <TableCell>{o.items.length}</TableCell>
                <TableCell>
                  {o.items.reduce((sum, it) => sum + it.quantity, 0)}
                </TableCell>
                <TableCell>
                  <Badge variant={o.ordered ? "success" : "outline"}>
                    {o.ordered ? "Đã đặt" : "Chưa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={o.arrived ? "success" : "outline"}>
                    {o.arrived ? "Đã về" : "Chưa"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {o.createdBy.name}
                </TableCell>
                {isAdmin && (
                  <TableCell className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(o.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <ConfirmDeleteButton
                      disabled={isPending}
                      title="Xoá đợt order này?"
                      description={`Đợt ${o.brand.name} ngày ${formatDate(o.date)} sẽ bị xoá vĩnh viễn.`}
                      onConfirm={() => handleDelete(o.id)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 8 : 7}
                  className="text-center text-muted-foreground"
                >
                  Chưa có đợt order nào
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Đợt order {detail?.code}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <p className="break-words">
                  <span className="text-muted-foreground">Ngày: </span>
                  {formatDate(detail.date)}
                </p>
                <p className="break-words">
                  <span className="text-muted-foreground">Brand: </span>
                  {detail.brand.name}
                </p>
                <p className="break-words">
                  <span className="text-muted-foreground">Người tạo: </span>
                  {detail.createdBy.name}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={detail.ordered}
                    disabled={isPending}
                    onCheckedChange={() =>
                      toggleFlag(detail.id, "ordered", detail.ordered)
                    }
                  />
                  <span>Đã đặt</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={detail.arrived}
                    disabled={isPending}
                    onCheckedChange={() =>
                      toggleFlag(detail.id, "arrived", detail.arrived)
                    }
                  />
                  <span>Đã về</span>
                </div>
              </div>

              <div className="-mx-4 overflow-x-auto px-4">
                <Table className="min-w-[420px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên hàng</TableHead>
                      <TableHead className="w-24">Số lượng</TableHead>
                      <TableHead>Ghi chú</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.items.map((it) => (
                      <TableRow key={it.id}>
                        <TableCell>{it.itemName}</TableCell>
                        <TableCell className="font-medium">{it.quantity}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {it.note}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {detail.note && (
                <p className="text-muted-foreground">Ghi chú: {detail.note}</p>
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
                  <Pencil className="h-4 w-4" /> Sửa đợt order
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editableOrder && (
        <VnOrderForm
          brands={brands}
          skus={skus}
          editingOrder={editableOrder}
          open={!!editing}
          onOpenChange={(o) => !o && setEditingId(null)}
          hideTrigger
        />
      )}
    </>
  );
}
