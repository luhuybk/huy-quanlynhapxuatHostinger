"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createSku, updateSku, deleteSku } from "@/lib/actions/catalog";

type Sku = {
  id: string;
  code: string;
  name: string;
  brandId: string;
  brand: { name: string };
  unitsPerCase: number;
  supplierId: string | null;
  isQuickCreate: boolean;
};
type Brand = { id: string; name: string };
type Supplier = { id: string; name: string };

function SkuFormFields({
  brands,
  suppliers,
  defaults,
}: {
  brands: Brand[];
  suppliers: Supplier[];
  defaults?: Sku;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Tên sản phẩm</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="brandId">Brand</Label>
        <Select name="brandId" defaultValue={defaults?.brandId}>
          <SelectTrigger id="brandId">
            <SelectValue placeholder="Chọn brand" />
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="unitsPerCase">Số lượng lẻ / thùng</Label>
        <Input
          id="unitsPerCase"
          name="unitsPerCase"
          type="number"
          min={1}
          defaultValue={defaults?.unitsPerCase ?? 1}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="supplierId">Nhà cung cấp mặc định</Label>
        <Select
          name="supplierId"
          defaultValue={defaults?.supplierId ?? undefined}
        >
          <SelectTrigger id="supplierId">
            <SelectValue placeholder="(Không bắt buộc)" />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!defaults && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Mã SKU (để trống để tự sinh)</Label>
          <Input id="code" name="code" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Checkbox
          id="isQuickCreate"
          name="isQuickCreate"
          defaultChecked={defaults?.isQuickCreate}
        />
        <Label htmlFor="isQuickCreate" className="font-normal">
          Tạo nhanh (gợi ý ưu tiên khi nhập/xuất hàng)
        </Label>
      </div>
    </>
  );
}

export function SkuManager({
  skus,
  brands,
  suppliers,
}: {
  skus: Sku[];
  brands: Brand[];
  suppliers: Supplier[];
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Sku | null>(null);

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        await createSku(formData);
        toast.success("Đã thêm SKU");
        setAddOpen(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      try {
        await updateSku(id, formData);
        toast.success("Đã cập nhật SKU");
        setEditing(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteSku(id);
        toast.success("Đã xoá SKU");
      } catch {
        toast.error("Không thể xoá — SKU đang được dùng trong phiếu");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={brands.length === 0}>
              <Plus className="h-4 w-4" /> Thêm SKU
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm SKU</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="flex flex-col gap-4">
              <SkuFormFields brands={brands} suppliers={suppliers} />
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  Lưu
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            <TableHead>Mã SKU</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Tên sản phẩm</TableHead>
            <TableHead>Quy cách</TableHead>
            <TableHead>Tạo nhanh</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {skus.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.code}</TableCell>
              <TableCell>{s.brand.name}</TableCell>
              <TableCell>{s.name}</TableCell>
              <TableCell>1 thùng = {s.unitsPerCase} sp</TableCell>
              <TableCell>
                {s.isQuickCreate && <Badge variant="secondary">Nhanh</Badge>}
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
          {skus.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-center text-muted-foreground"
              >
                Chưa có SKU nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa SKU</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              action={(fd) => handleUpdate(editing.id, fd)}
              className="flex flex-col gap-4"
            >
              <SkuFormFields
                brands={brands}
                suppliers={suppliers}
                defaults={editing}
              />
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
