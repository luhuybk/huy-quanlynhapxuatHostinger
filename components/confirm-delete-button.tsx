"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";

// Nút xoá luôn hỏi lại trước khi xoá — nút này nằm ngay cạnh nút Sửa nên rất
// dễ bấm nhầm, mà xoá phiếu thì không khôi phục lại được.
export function ConfirmDeleteButton({
  onConfirm,
  disabled,
  title = "Xoá phiếu này?",
  description,
}: {
  onConfirm: () => void;
  disabled?: boolean;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen(true)}
        aria-label="Xoá"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-sm">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {description ?? "Thao tác này không thể hoàn tác."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              disabled={disabled}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              Xoá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
