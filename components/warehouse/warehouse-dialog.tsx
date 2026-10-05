"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MAX_SIDE, MIN_SIDE } from "@/lib/warehouse-layout";
import { createWarehouse, updateWarehouse } from "@/lib/actions/warehouse";
import type { WarehouseLite } from "@/components/warehouse/types";

// Thêm kho mới. Kích thước lưới chỉ là điểm bắt đầu — vào trình vẽ đổi lúc nào
// cũng được, nên không cần đo chính xác mặt bằng ngay từ đây.
export function CreateWarehouseDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      try {
        const id = await createWarehouse(formData);
        toast.success("Đã thêm kho");
        setOpen(false);
        onCreated(id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Thêm kho
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-1rem)]">
        <DialogHeader>
          <DialogTitle>Thêm kho</DialogTitle>
        </DialogHeader>
        <form action={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-name">Tên kho</Label>
            <Input id="wh-name" name="name" placeholder="Kho chính" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="wh-cols">Số cột</Label>
              <Input
                id="wh-cols"
                name="cols"
                type="number"
                inputMode="numeric"
                min={MIN_SIDE}
                max={MAX_SIDE}
                defaultValue={12}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="wh-rows">Số hàng</Label>
              <Input
                id="wh-rows"
                name="rows"
                type="number"
                inputMode="numeric"
                min={MIN_SIDE}
                max={MAX_SIDE}
                defaultValue={8}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-note">Ghi chú (không bắt buộc)</Label>
            <Input id="wh-note" name="note" placeholder="Địa chỉ, tầng..." />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditWarehouseDialog({
  warehouse,
  open,
  onOpenChange,
}: {
  warehouse: WarehouseLite;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleUpdate(formData: FormData) {
    startTransition(async () => {
      try {
        await updateWarehouse(warehouse.id, formData);
        toast.success("Đã cập nhật kho");
        onOpenChange(false);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)]">
        <DialogHeader>
          <DialogTitle>Sửa kho</DialogTitle>
        </DialogHeader>
        <form action={handleUpdate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-edit-name">Tên kho</Label>
            <Input id="wh-edit-name" name="name" defaultValue={warehouse.name} required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wh-edit-note">Ghi chú</Label>
            <Input id="wh-edit-note" name="note" defaultValue={warehouse.note ?? ""} />
          </div>
          <p className="text-sm text-muted-foreground">
            Số cột và số hàng đổi trong trình vẽ sơ đồ.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
