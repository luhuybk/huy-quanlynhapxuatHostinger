"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Check, X } from "lucide-react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  createChinaOrderItem,
  updateChinaOrderItem,
  toggleChinaOrderItem,
  toggleChinaOrderItemArrived,
  deleteChinaOrderItem,
} from "@/lib/actions/china-order-items";

type Role = "ADMIN" | "SHARED" | "STAFF";

type ChinaOrderItemRow = {
  id: string;
  itemName: string;
  quantity: number;
  note: string | null;
  ordered: boolean;
  arrived: boolean;
  createdAt: Date;
  createdBy: { name: string };
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("vi-VN");
}

export function ChinaOrderList({
  role,
  items,
}: {
  role: Role;
  items: ChinaOrderItemRow[];
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState(1);
  const [newNote, setNewNote] = useState("");

  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState(1);
  const [editNote, setEditNote] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Vui lòng nhập tên hàng");
      return;
    }
    if (!newQty || newQty <= 0) {
      toast.error("Số lượng không hợp lệ");
      return;
    }

    const formData = new FormData();
    formData.set("itemName", newName.trim());
    formData.set("quantity", String(newQty));
    formData.set("note", newNote);

    startTransition(async () => {
      try {
        await createChinaOrderItem(formData);
        toast.success("Đã thêm vào danh sách cần order");
        setNewName("");
        setNewQty(1);
        setNewNote("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  function startEdit(item: ChinaOrderItemRow) {
    setEditingId(item.id);
    setEditName(item.itemName);
    setEditQty(item.quantity);
    setEditNote(item.note ?? "");
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("Vui lòng nhập tên hàng");
      return;
    }
    if (!editQty || editQty <= 0) {
      toast.error("Số lượng không hợp lệ");
      return;
    }

    const formData = new FormData();
    formData.set("itemName", editName.trim());
    formData.set("quantity", String(editQty));
    formData.set("note", editNote);

    startTransition(async () => {
      try {
        await updateChinaOrderItem(id, formData);
        toast.success("Đã cập nhật");
        setEditingId(null);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleToggle(id: string, ordered: boolean) {
    startTransition(async () => {
      try {
        await toggleChinaOrderItem(id, ordered);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleToggleArrived(id: string, arrived: boolean) {
    startTransition(async () => {
      try {
        await toggleChinaOrderItemArrived(id, arrived);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteChinaOrderItem(id);
        toast.success("Đã xoá");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không thể xoá");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleAdd}
        className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm text-muted-foreground">Tên hàng</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tên hàng cần order..."
          />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <label className="text-sm text-muted-foreground">Số lượng</label>
          <Input
            type="number"
            min={1}
            value={newQty}
            onChange={(e) => setNewQty(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label className="text-sm text-muted-foreground">Ghi chú</label>
          <Input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Ghi chú (không bắt buộc)"
          />
        </div>
        <Button type="submit" disabled={isPending}>
          <Plus className="h-4 w-4" /> Thêm
        </Button>
      </form>

      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <Table
          className="sm:min-w-[640px]"
          containerClassName="max-h-[calc(100vh-24rem)]"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">
                <span className="sm:hidden">Đặt</span>
                <span className="hidden sm:inline">Đã đặt</span>
              </TableHead>
              <TableHead className="w-16 text-center">
                <span className="sm:hidden">Về</span>
                <span className="hidden sm:inline">Đã về</span>
              </TableHead>
              <TableHead>Tên hàng</TableHead>
              <TableHead className="w-20">SL</TableHead>
              <TableHead className="hidden sm:table-cell">Ghi chú</TableHead>
              <TableHead className="hidden sm:table-cell">Ngày điền</TableHead>
              <TableHead className="hidden sm:table-cell">Người thêm</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) =>
              editingId === it.id ? (
                <TableRow key={it.id}>
                  <TableCell />
                  <TableCell />
                  <TableCell>
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <Input
                      className="mt-1 sm:hidden"
                      value={editNote}
                      placeholder="Ghi chú"
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={editQty}
                      onChange={(e) => setEditQty(Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(it.createdAt)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {it.createdBy.name}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleSaveEdit(it.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={it.id} className={it.ordered ? "opacity-50" : undefined}>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={it.ordered}
                      onCheckedChange={(c) => handleToggle(it.id, c === true)}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Checkbox
                      checked={it.arrived}
                      onCheckedChange={(c) => handleToggleArrived(it.id, c === true)}
                    />
                  </TableCell>
                  <TableCell className={it.ordered ? "line-through" : undefined}>
                    <span className="block max-w-[8rem] truncate sm:max-w-none">
                      {it.itemName}
                    </span>
                    {it.note && (
                      <span className="block max-w-[8rem] truncate text-muted-foreground sm:hidden">
                        {it.note}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{it.quantity}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {it.note}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(it.createdAt)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {it.createdBy.name}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(it)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {isAdmin && (
                      <ConfirmDeleteButton
                        disabled={isPending}
                        title="Xoá mục này?"
                        description={`"${it.itemName}" sẽ bị xoá khỏi danh sách cần order.`}
                        onConfirm={() => handleDelete(it.id)}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )
            )}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Không có hàng cần order
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
