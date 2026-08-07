"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createBrand, updateBrand, deleteBrand, reorderBrands } from "@/lib/actions/catalog";
import { SortableTable } from "@/components/settings/sortable-table";
import { SortableRow } from "@/components/settings/sortable-row";

type Brand = { id: string; name: string };

export function BrandManager({ brands }: { brands: Brand[] }) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [items, setItems] = useState(brands);
  const [prevBrands, setPrevBrands] = useState(brands);
  if (brands !== prevBrands) {
    setPrevBrands(brands);
    setItems(brands);
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createBrand(formData);
        toast.success("Đã thêm brand");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateBrand(id, formData);
        toast.success("Đã cập nhật brand");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteBrand(id);
        toast.success("Đã xoá brand");
      } catch {
        toast.error("Không thể xoá — có thể đang được dùng cho SKU");
      }
    });
  }

  function handleReorder(reordered: Brand[]) {
    setItems(reordered);
    startTransition(async () => {
      await reorderBrands(reordered.map((b) => b.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Thêm brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm brand</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Tên brand</Label>
                <Input id="name" name="name" required />
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

      <SortableTable
        id="brand-manager"
        items={items}
        onReorder={handleReorder}
        header={
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Tên brand</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        }
      >
        {(sorted) => (
          <>
            {sorted.map((b) => (
              <SortableRow key={b.id} id={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </SortableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Chưa có brand nào
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </SortableTable>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa brand</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">Tên brand</Label>
                <Input id="edit-name" name="name" defaultValue={editing.name} required />
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
