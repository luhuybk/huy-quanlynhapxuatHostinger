"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type CopyBuildOptions = { includeNotes: boolean; merge: boolean };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  build: (opts: CopyBuildOptions) => string;
  defaultIncludeNotes?: boolean;
  // Có thì hiện ô "gộp thêm ..." (vd. các đợt chưa đặt khác cùng brand).
  mergeLabel?: string;
  // Số mục sẽ được đánh dấu "đã đặt" theo lựa chọn gộp; 0 thì ẩn ô đánh dấu.
  markCount: (merge: boolean) => number;
  onMarkOrdered: (merge: boolean) => Promise<void>;
};

export function CopyOrderDialog({ open, onOpenChange, title, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100%-1rem)] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Sửa thẳng trong ô nếu cần, rồi copy dán qua Zalo/Messenger cho hãng.
          </DialogDescription>
        </DialogHeader>
        {/* Nội dung chỉ mount khi mở, nên mỗi lần mở là soạn lại từ đầu. */}
        <CopyOrderBody {...rest} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CopyOrderBody({
  build,
  defaultIncludeNotes = true,
  mergeLabel,
  markCount,
  onMarkOrdered,
  onDone,
}: Omit<Props, "open" | "onOpenChange" | "title"> & { onDone: () => void }) {
  const [includeNotes, setIncludeNotes] = useState(defaultIncludeNotes);
  const [merge, setMerge] = useState(false);
  // null = chưa sửa tay, hiện bản soạn tự động. Đổi tuỳ chọn thì soạn lại.
  const [edited, setEdited] = useState<string | null>(null);
  const [mark, setMark] = useState(true);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const text = edited ?? build({ includeNotes, merge });
  const count = markCount(merge);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function writeClipboard() {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Trình duyệt trong app (Zalo, Facebook) hoặc trang http không có
      // Clipboard API: chọn chữ trong ô rồi dùng lệnh copy cũ.
      const el = textareaRef.current;
      if (!el) return false;
      el.focus();
      el.select();
      return document.execCommand("copy");
    }
  }

  function finish(message: string) {
    if (!mark || count === 0) {
      toast.success(message);
      onDone();
      return;
    }
    startTransition(async () => {
      try {
        await onMarkOrdered(merge);
        toast.success(`${message} · đã đánh dấu ${count} mục là đã đặt`);
        onDone();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không đánh dấu được");
      }
    });
  }

  async function handleCopy() {
    if (await writeClipboard()) finish("Đã copy danh sách");
    else toast.error("Không copy được — hãy giữ vào ô chữ để copy tay");
  }

  async function handleShare() {
    try {
      await navigator.share({ text });
      finish("Đã chia sẻ danh sách");
    } catch (err) {
      // Người dùng tự đóng bảng chia sẻ thì thôi, không báo lỗi.
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Không chia sẻ được, hãy dùng nút Copy");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={includeNotes}
            onCheckedChange={(c) => {
              setIncludeNotes(c === true);
              setEdited(null);
            }}
          />
          <span>Kèm ghi chú</span>
        </label>
        {mergeLabel && (
          <label className="flex items-center gap-2">
            <Checkbox
              checked={merge}
              onCheckedChange={(c) => {
                setMerge(c === true);
                setEdited(null);
              }}
            />
            <span>{mergeLabel}</span>
          </label>
        )}
      </div>

      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setEdited(e.target.value)}
        className="max-h-[45vh] min-h-40 overflow-y-auto font-mono text-sm md:text-sm"
      />

      {count > 0 && (
        <label className="flex items-center gap-2">
          <Checkbox checked={mark} onCheckedChange={(c) => setMark(c === true)} />
          <span>
            Đánh dấu {count === 1 ? "mục này" : `${count} mục này`} là{" "}
            <span className="font-medium">đã đặt</span> sau khi copy
          </span>
        </label>
      )}

      <DialogFooter className="gap-2 sm:gap-2">
        {canShare && (
          <Button variant="outline" disabled={isPending} onClick={handleShare}>
            <Share2 className="h-4 w-4" /> Chia sẻ
          </Button>
        )}
        <Button disabled={isPending} onClick={handleCopy}>
          <Copy className="h-4 w-4" /> Copy
        </Button>
      </DialogFooter>
    </div>
  );
}
