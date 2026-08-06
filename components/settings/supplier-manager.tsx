"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/actions/catalog";

type Supplier = { id: string; name: string; note: string | null };

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createSupplier(formData);
        toast.success("Đã thêm nhà cung cấp");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateSupplier(id, formData);
        toast.success("Đã cập nhật nhà cung cấp");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSupplier(id);
        toast.success("Đã xoá nhà cung cấp");
      } catch {
        toast.error("Không thể xoá — có thể đang được dùng cho SKU/phiếu");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Thêm nhà cung cấp
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm nhà cung cấp</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Tên nhà cung cấp</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="note">Ghi chú</Label>
                <Input id="note" name="note" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tên nhà cung cấp</TableHead>
            <TableHead>Ghi chú</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {suppliers.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {s.note}
              </TableCell>
              <TableCell className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditing(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleDelete(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {suppliers.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={3}
                className="text-center text-muted-foreground"
              >
                Chưa có nhà cung cấp nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa nhà cung cấp</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">Tên nhà cung cấp</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editing.name}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-note">Ghi chú</Label>
                <Input
                  id="edit-note"
                  name="note"
                  defaultValue={editing.note ?? ""}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
