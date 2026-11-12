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
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/lib/actions/catalog";
import { SortableTable } from "@/components/settings/sortable-table";
import { SortableRow } from "@/components/settings/sortable-row";

type Category = { id: string; name: string; _count: { skus: number } };

// Phân loại dùng chung cho mọi brand (Sáp, Xịt phồng - hỗ trợ tạo kiểu, Dưỡng,
// Khác...). Gán phân loại cho từng mã ngay trong bảng ở tab SKU.
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [items, setItems] = useState(categories);
  const [prevCats, setPrevCats] = useState(categories);
  if (categories !== prevCats) {
    setPrevCats(categories);
    setItems(categories);
  }

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createCategory(formData);
        toast.success("Đã thêm phân loại");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateCategory(id, formData);
        toast.success("Đã cập nhật phân loại");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCategory(id);
        toast.success("Đã xoá phân loại — các mã của nó về Chưa phân loại");
      } catch {
        toast.error("Không xoá được phân loại");
      }
    });
  }

  function handleReorder(reordered: Category[]) {
    setItems(reordered);
    startTransition(async () => {
      await reorderCategories(reordered.map((b) => b.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-prose text-sm text-muted-foreground">
          Dùng chung cho mọi brand. Gán cho từng mã ở cột Phân loại trong tab SKU; kéo
          thả để đổi thứ tự hiện ở trang Order theo hình.
        </p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="self-end sm:self-auto">
              <Plus className="h-4 w-4" /> Thêm phân loại
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm phân loại</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="cat-name">Tên phân loại</Label>
                <Input id="cat-name" name="name" placeholder="VD: Sáp" required />
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
        id="category-manager"
        items={items}
        onReorder={handleReorder}
        header={
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Tên phân loại</TableHead>
            <TableHead>Số mã</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        }
      >
        {(sorted) => (
          <>
            {sorted.map((b) => (
              <SortableRow key={b.id} id={b.id}>
                <TableCell>{b.name}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{b._count.skus}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(b)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => {
                      if (b._count.skus > 0 && !confirm(`Xoá "${b.name}"? ${b._count.skus} mã sẽ về Chưa phân loại.`)) return;
                      handleDelete(b.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </SortableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Chưa có phân loại nào
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </SortableTable>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa phân loại</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-cat-name">Tên phân loại</Label>
                <Input id="edit-cat-name" name="name" defaultValue={editing.name} required />
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
