"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  createSku,
  updateSku,
  deleteSku,
  reorderSkus,
  setSkusCategory,
} from "@/lib/actions/catalog";
import { SortableTable } from "@/components/settings/sortable-table";
import { SortableRow } from "@/components/settings/sortable-row";
import { cn } from "@/lib/utils";
import { zoneColor } from "@/lib/zone-colors";

type Sku = {
  id: string;
  code: string;
  name: string;
  size: string | null;
  brandId: string;
  brand: { name: string };
  unitsPerCase: number;
  supplierId: string | null;
  zoneId: string | null;
  zone: { id: string; code: string; color: string } | null;
  categoryId: string | null;
  isQuickCreate: boolean;
};
type Category = { id: string; name: string };
type Brand = { id: string; name: string };
type Supplier = { id: string; name: string };
type WarehouseOption = {
  id: string;
  name: string;
  zones: { id: string; code: string; name: string | null }[];
};

function SkuFormFields({
  brands,
  suppliers,
  warehouses,
  categories,
  defaults,
}: {
  brands: Brand[];
  suppliers: Supplier[];
  warehouses: WarehouseOption[];
  categories: Category[];
  defaults?: Sku;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Tên sản phẩm</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="size">Size (không bắt buộc)</Label>
        <Input id="size" name="size" defaultValue={defaults?.size ?? ""} placeholder="56" />
        <p className="text-sm text-muted-foreground">
          Tách size ra khỏi tên để mã in ra thống nhất: 1 - AKUMA - Clay - 56.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="brandId">Brand</Label>
        <Select name="brandId" defaultValue={defaults?.brandId}>
          <SelectTrigger id="brandId" className="w-full">
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
        <Label htmlFor="categoryId">Phân loại</Label>
        <Select name="categoryId" defaultValue={defaults?.categoryId ?? "none"}>
          <SelectTrigger id="categoryId" className="w-full">
            <SelectValue placeholder="Chưa phân loại" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chưa phân loại</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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
          <SelectTrigger id="supplierId" className="w-full">
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="zoneId">Khu vực đang chứa</Label>
        <Select name="zoneId" defaultValue={defaults?.zoneId ?? "none"}>
          <SelectTrigger id="zoneId" className="w-full">
            <SelectValue placeholder="Chưa gán khu" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Chưa gán khu</SelectItem>
            {warehouses.map((w) => (
              <SelectGroup key={w.id}>
                <SelectLabel>{w.name}</SelectLabel>
                {w.zones.map((z) => (
                  <SelectItem key={z.id} value={z.id}>
                    {z.code}
                    {z.name ? ` — ${z.name}` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
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
  warehouses,
  categories,
}: {
  skus: Sku[];
  brands: Brand[];
  suppliers: Supplier[];
  warehouses: WarehouseOption[];
  categories: Category[];
}) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Sku | null>(null);
  const [items, setItems] = useState(skus);
  const [prevSkus, setPrevSkus] = useState(skus);
  if (skus !== prevSkus) {
    setPrevSkus(skus);
    setItems(skus);
  }

  // Lọc theo khu: 97 dòng rà bằng mắt rất cực, nhất là khi cần tìm những mã
  // chưa gán khu. "none" = chưa gán khu.
  const [zoneFilter, setZoneFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const filtering = zoneFilter !== "all" || categoryFilter !== "all";
  const visible = useMemo(() => {
    return items.filter((s) => {
      if (zoneFilter === "none" ? s.zoneId : zoneFilter !== "all" && s.zoneId !== zoneFilter) return false;
      if (categoryFilter === "none" ? s.categoryId : categoryFilter !== "all" && s.categoryId !== categoryFilter)
        return false;
      return true;
    });
  }, [items, zoneFilter, categoryFilter]);
  const unassignedCount = items.filter((s) => !s.zoneId).length;
  const uncategorizedCount = items.filter((s) => !s.categoryId).length;

  // Đổi phân loại ngay trên dòng: hiện liền, lưu ngầm, lỗi thì trả lại như cũ.
  function handleSetCategory(sku: Sku, value: string) {
    const categoryId = value === "none" ? null : value;
    const before = sku.categoryId;
    setItems((prev) => prev.map((s) => (s.id === sku.id ? { ...s, categoryId } : s)));
    startTransition(async () => {
      try {
        await setSkusCategory([sku.id], categoryId);
      } catch {
        setItems((prev) => prev.map((s) => (s.id === sku.id ? { ...s, categoryId: before } : s)));
        toast.error("Không đổi được phân loại");
      }
    });
  }

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

  function handleReorder(reordered: Sku[]) {
    setItems(reordered);
    startTransition(async () => {
      await reorderSkus(reordered.map((s) => s.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={zoneFilter} onValueChange={setZoneFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả khu ({items.length} mã)</SelectItem>
              <SelectItem value="none">Chưa gán khu ({unassignedCount} mã)</SelectItem>
              {warehouses.map((w) => (
                <SelectGroup key={w.id}>
                  <SelectLabel>{w.name}</SelectLabel>
                  {w.zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.code}
                      {z.name ? ` — ${z.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phân loại</SelectItem>
              <SelectItem value="none">Chưa phân loại ({uncategorizedCount} mã)</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({items.filter((s) => s.categoryId === c.id).length} mã)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtering && (
            <span className="text-sm text-muted-foreground">
              {visible.length} mã — đang lọc nên tạm khoá kéo-thả sắp xếp
            </span>
          )}
        </div>
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
              <SkuFormFields
                brands={brands}
                suppliers={suppliers}
                warehouses={warehouses}
                categories={categories}
              />
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
      <SortableTable
        id="sku-manager"
        items={visible}
        onReorder={handleReorder}
        disabled={filtering}
        className="min-w-[1000px]"
        header={
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Mã SKU</TableHead>
            <TableHead>Khu</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Tên sản phẩm</TableHead>
            <TableHead>Phân loại</TableHead>
            <TableHead>Quy cách</TableHead>
            <TableHead>Tạo nhanh</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        }
      >
        {(sorted) => (
          <>
            {sorted.map((s) => (
              <SortableRow key={s.id} id={s.id} disabled={filtering}>
                <TableCell className="font-mono text-xs">{s.code}</TableCell>
                <TableCell>
                  {s.zone ? (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-medium",
                        zoneColor(s.zone.color).badge
                      )}
                    >
                      {s.zone.code}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{s.brand.name}</TableCell>
                <TableCell>
                  {s.name}
                  {s.size && (
                    <span className="text-muted-foreground"> · {s.size}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Select
                    value={s.categoryId ?? "none"}
                    onValueChange={(v) => handleSetCategory(s, v)}
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Phân loại của ${s.name}`}
                      className={cn("w-52", !s.categoryId && "text-muted-foreground")}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Chưa phân loại</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>1 thùng = {s.unitsPerCase} sp</TableCell>
                <TableCell>
                  {s.isQuickCreate && <Badge variant="secondary">Nhanh</Badge>}
                </TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditing(s)}>
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
              </SortableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  {filtering ? "Không có mã hàng nào khớp bộ lọc" : "Chưa có SKU nào"}
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </SortableTable>
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
                warehouses={warehouses}
                categories={categories}
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
