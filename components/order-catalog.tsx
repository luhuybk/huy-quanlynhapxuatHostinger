"use client";

import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, ImageOff, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CopyOrderDialog } from "@/components/copy-order-dialog";
import { createVnOrder, markVnOrdersOrdered } from "@/lib/actions/vn-orders";
import { removeSkuImage, setSkuImage } from "@/lib/actions/sku-images";
import { buildOrderText, formatTotalQty } from "@/lib/order-text";
import { resizeImage } from "@/lib/resize-image";
import { toDateInputValue } from "@/lib/date-input";
import { cn } from "@/lib/utils";

export type CatalogSku = {
  id: string;
  code: string;
  name: string;
  size: string | null;
  brandId: string;
  unitsPerCase: number;
  categoryId: string | null;
  imageUrl: string | null;
};

type CatalogCategory = { id: string; name: string };
// Nhóm giả cho các mã chưa gán phân loại, luôn nằm cuối.
const UNCATEGORIZED = "__none";

type Unit = "CASE" | "UNIT";
type Line = { qty: number; unit: Unit; note: string };
// Nháp theo từng brand: { brandId: { skuId: Line } }.
type Drafts = Record<string, Record<string, Line>>;

const DRAFT_KEY = "order-catalog-draft-v1";

function loadDrafts(): Drafts {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

function saveDrafts(d: Drafts) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Trình duyệt chặn lưu (chế độ ẩn danh...): vẫn order được, chỉ mất nháp khi tải lại.
  }
}

function itemName(s: CatalogSku) {
  return s.size ? `${s.name} - ${s.size}` : s.name;
}

const noopSubscribe = () => () => {};

// Nháp nằm trong localStorage nên chỉ đọc được ở trình duyệt: chờ tới lúc
// chạy trên máy người dùng rồi mới vẽ, khỏi lệch giữa bản server và bản máy.
export function OrderCatalog(props: {
  brands: { id: string; name: string; count: number }[];
  skus: CatalogSku[];
  categories: CatalogCategory[];
  initialBrandId?: string;
}) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!isClient) return <p className="text-muted-foreground">Đang tải danh mục…</p>;
  return <CatalogBody {...props} />;
}

function CatalogBody({
  brands,
  skus,
  categories,
  initialBrandId,
}: {
  brands: { id: string; name: string; count: number }[];
  skus: CatalogSku[];
  categories: CatalogCategory[];
  initialBrandId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Drafts>(loadDrafts);
  const [brandId, setBrandId] = useState(() => {
    if (initialBrandId && brands.some((b) => b.id === initialBrandId)) return initialBrandId;
    // Mở lại đúng brand đang order dở, nếu có.
    const withDraft = brands.find((b) => Object.keys(drafts[b.id] ?? {}).length > 0);
    return withDraft?.id ?? brands[0]?.id ?? "";
  });
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [zoom, setZoom] = useState<CatalogSku | null>(null);
  const [saved, setSaved] = useState<{ id: string; text: (n: boolean) => string } | null>(null);

  const brand = brands.find((b) => b.id === brandId);
  const lines = drafts[brandId] ?? {};

  const brandSkus = useMemo(() => skus.filter((s) => s.brandId === brandId), [skus, brandId]);

  // Chỉ hiện những phân loại brand này có hàng; "Chưa phân loại" luôn xếp cuối.
  const brandCategories = useMemo(() => {
    const list: { id: string; name: string; count: number }[] = categories
      .map((c) => ({ ...c, count: brandSkus.filter((s) => s.categoryId === c.id).length }))
      .filter((c) => c.count > 0);
    const known = new Set(categories.map((c) => c.id));
    const loose = brandSkus.filter((s) => !s.categoryId || !known.has(s.categoryId)).length;
    if (loose > 0) list.push({ id: UNCATEGORIZED, name: "Chưa phân loại", count: loose });
    return list;
  }, [categories, brandSkus]);
  const activeCategory = brandCategories.some((c) => c.id === categoryId) ? categoryId : "all";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return brandSkus.filter(
      (s) => !q || itemName(s).toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [brandSkus, query]);

  // Chia theo phân loại để lướt nhanh: đang chọn một phân loại thì chỉ còn nhóm đó.
  const groups = useMemo(() => {
    return brandCategories
      .filter((c) => activeCategory === "all" || c.id === activeCategory)
      .map((c) => ({
        ...c,
        items: visible.filter((s) =>
          c.id === UNCATEGORIZED
            ? !s.categoryId || !categories.some((k) => k.id === s.categoryId)
            : s.categoryId === c.id
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [brandCategories, activeCategory, visible, categories]);
  const visibleCount = groups.reduce((n, g) => n + g.items.length, 0);
  // Brand chỉ có một nhóm thì khỏi in tiêu đề cho đỡ rối.
  const showHeadings = brandCategories.length > 1;

  // Các món đã chọn: gom theo phân loại (đúng thứ tự trong Cài đặt), trong
  // từng phân loại giữ thứ tự danh mục — để bản copy gửi hãng cũng gọn theo nhóm.
  const categoryRank = (s: CatalogSku) => {
    const i = categories.findIndex((c) => c.id === s.categoryId);
    return i === -1 ? categories.length : i;
  };
  const picked = skus
    .filter((s) => s.brandId === brandId && (lines[s.id]?.qty ?? 0) > 0)
    .sort((a, b) => categoryRank(a) - categoryRank(b))
    .map((s) => ({ sku: s, line: lines[s.id] }));

  function updateLine(skuId: string, patch: Partial<Line>) {
    setDrafts((prev) => {
      const current = prev[brandId]?.[skuId] ?? { qty: 0, unit: "UNIT" as Unit, note: "" };
      const nextLine = { ...current, ...patch };
      const brandLines = { ...(prev[brandId] ?? {}) };
      // Bỏ dòng trống để nháp khỏi phình ra theo thời gian.
      if (nextLine.qty <= 0 && !nextLine.note && nextLine.unit === "UNIT") delete brandLines[skuId];
      else brandLines[skuId] = nextLine;
      const next = { ...prev, [brandId]: brandLines };
      saveDrafts(next);
      return next;
    });
  }

  function clearBrand() {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[brandId];
      saveDrafts(next);
      return next;
    });
  }

  function handleSave() {
    if (!brand || picked.length === 0) return;
    const items = picked.map(({ sku, line }) => ({
      skuId: sku.id,
      itemName: itemName(sku),
      quantity: line.qty,
      unitType: line.unit,
      note: line.note,
    }));
    const formData = new FormData();
    formData.set("date", toDateInputValue());
    formData.set("brandId", brand.id);
    formData.set("note", "");
    formData.set("items", JSON.stringify(items));

    startTransition(async () => {
      try {
        const { id } = await createVnOrder(formData);
        const title = `Đặt hàng ${brand.name}`;
        // Chụp lại nội dung trước khi xoá nháp, để bảng copy vẫn có dữ liệu.
        const textItems = items.map((it) => ({ ...it, note: it.note || null }));
        setSaved({
          id,
          text: (includeNotes) => buildOrderText({ title, items: textItems, includeNotes }),
        });
        clearBrand();
        toast.success(`Đã lưu đợt order ${brand.name}`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không lưu được đợt order");
      }
    });
  }

  if (brands.length === 0) {
    return <p className="text-muted-foreground">Chưa có sản phẩm nào trong Cài đặt.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Chọn brand: cuộn ngang trên điện thoại, xuống dòng trên máy tính. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {brands.map((b) => {
          const count = Object.values(drafts[b.id] ?? {}).filter((l) => l.qty > 0).length;
          return (
            <Button
              key={b.id}
              size="sm"
              variant={b.id === brandId ? "default" : "outline"}
              className="shrink-0"
              onClick={() => {
                setBrandId(b.id);
                setQuery("");
                setCategoryId("all");
              }}
            >
              {b.name}
              {count > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{count}</span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="relative sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Tìm trong ${brand?.name ?? "brand"}…`}
          className="pl-8"
        />
      </div>

      {brandCategories.length > 1 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ id: "all", name: "Tất cả", count: brandSkus.length }, ...brandCategories].map((c) => {
            const picked = brandSkus.filter(
              (s) =>
                (lines[s.id]?.qty ?? 0) > 0 &&
                (c.id === "all" ||
                  (c.id === UNCATEGORIZED
                    ? !s.categoryId || !categories.some((k) => k.id === s.categoryId)
                    : s.categoryId === c.id))
            ).length;
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "bg-background text-muted-foreground hover:text-foreground"
                )}
              >
                {c.name}
                <span className={cn("text-xs tabular-nums", active ? "opacity-70" : "opacity-60")}>
                  {c.count}
                </span>
                {picked > 0 && (
                  <span className="rounded-full bg-amber-500 px-1.5 text-xs text-white">{picked}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.id} className="flex flex-col gap-2">
          {showHeadings && (
            <h2 className="flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {g.name}
              <span className="font-normal tabular-nums normal-case">{g.items.length} mã</span>
            </h2>
          )}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,19rem),1fr))]">
            {g.items.map((s) => (
              <SkuCard
                key={s.id}
                sku={s}
                line={lines[s.id]}
                onChange={(patch) => updateLine(s.id, patch)}
                onZoom={() => setZoom(s)}
              />
            ))}
          </div>
        </section>
      ))}
      {visibleCount === 0 && <p className="text-muted-foreground">Không có sản phẩm nào khớp.</p>}

      {/* Thanh tổng: nằm trên thanh điều hướng dưới cùng của điện thoại. */}
      <div className="sticky bottom-[4.5rem] z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <div className="flex gap-5 text-sm text-muted-foreground">
          <div>
            Số món
            <b className="block text-lg text-foreground tabular-nums">{picked.length}</b>
          </div>
          <div>
            Tổng
            <b className="block text-lg text-foreground tabular-nums">
              {picked.length ? formatTotalQty(picked.map(({ line }) => ({ quantity: line.qty, unitType: line.unit }))) : 0}
            </b>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={picked.length === 0 || isPending} onClick={clearBrand}>
            Xoá chọn
          </Button>
          <Button disabled={picked.length === 0 || isPending} onClick={handleSave}>
            {isPending ? "Đang lưu…" : "Lưu đợt order"}
          </Button>
        </div>
      </div>

      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="w-[calc(100%-1rem)] max-w-xl sm:max-w-xl">
          <DialogTitle>{zoom && itemName(zoom)}</DialogTitle>
          {zoom?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={zoom.imageUrl} alt={itemName(zoom)} className="max-h-[70vh] w-full rounded-lg bg-white object-contain" />
          )}
          {zoom && <ImageActions sku={zoom} onDone={() => setZoom(null)} />}
        </DialogContent>
      </Dialog>

      {saved && (
        <CopyOrderDialog
          open
          onOpenChange={(o) => !o && setSaved(null)}
          title={`Copy đợt order ${brand?.name ?? ""}`}
          build={({ includeNotes }) => saved.text(includeNotes)}
          markCount={() => 1}
          onMarkOrdered={async () => {
            await markVnOrdersOrdered([saved.id]);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function SkuCard({
  sku,
  line,
  onChange,
  onZoom,
}: {
  sku: CatalogSku;
  line?: Line;
  onChange: (patch: Partial<Line>) => void;
  onZoom: () => void;
}) {
  const qty = line?.qty ?? 0;
  const unit = line?.unit ?? "UNIT";
  const on = qty > 0;

  return (
    <article
      className={cn(
        "grid grid-cols-[6rem_minmax(0,1fr)] gap-3 rounded-xl border bg-card p-3 transition-colors",
        on && "border-primary ring-1 ring-primary"
      )}
    >
      {sku.imageUrl ? (
        <button type="button" onClick={onZoom} className="h-24 w-24 cursor-zoom-in" aria-label={`Xem ảnh ${sku.name}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sku.imageUrl}
            alt={sku.name}
            loading="lazy"
            className="h-24 w-24 rounded-lg border bg-white object-contain"
          />
        </button>
      ) : (
        <UploadImageButton skuId={sku.id} className="h-24 w-24" />
      )}

      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{sku.code}</p>
          <p className="leading-snug font-semibold">{itemName(sku)}</p>
          {sku.unitsPerCase > 1 && (
            <p className="text-sm text-muted-foreground">1 thùng = {sku.unitsPerCase}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Thùng / Lẻ */}
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Đơn vị">
            {(["CASE", "UNIT"] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => onChange({ unit: u })}
                className={cn(
                  "rounded-md px-2.5 py-1 text-sm",
                  unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                {u === "CASE" ? "Thùng" : "Lẻ"}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-lg border">
            <button
              type="button"
              aria-label="Giảm"
              className="flex h-8 w-8 items-center justify-center"
              onClick={() => onChange({ qty: Math.max(0, qty - 1) })}
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              inputMode="numeric"
              aria-label={`Số lượng ${sku.name}`}
              value={qty || ""}
              placeholder="0"
              onChange={(e) => onChange({ qty: Math.min(99999, Number(e.target.value.replace(/\D/g, "")) || 0) })}
              className="h-8 w-12 border-x bg-transparent text-center font-mono tabular-nums outline-none"
            />
            <button
              type="button"
              aria-label="Tăng"
              className="flex h-8 w-8 items-center justify-center"
              onClick={() => onChange({ qty: qty + 1 })}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {on && unit === "CASE" && sku.unitsPerCase > 1 && (
          <p className="text-sm text-muted-foreground">= {qty * sku.unitsPerCase} sp</p>
        )}
        {on && (
          <Input
            value={line?.note ?? ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Ghi chú món này"
            className="h-8 text-sm"
          />
        )}
      </div>
    </article>
  );
}

// Ô trống chỗ ảnh: bấm để chụp/chọn ảnh (điện thoại sẽ hỏi mở máy ảnh).
function UploadImageButton({ skuId, className }: { skuId: string; className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      try {
        const small = await resizeImage(file);
        const fd = new FormData();
        fd.set("image", small);
        await setSkuImage(skuId, fd);
        toast.success("Đã lưu ảnh");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Không lưu được ảnh");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted",
          className
        )}
      >
        <Camera className="h-5 w-5" />
        {isPending ? "Đang lưu…" : "Thêm ảnh"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) upload(file);
        }}
      />
    </>
  );
}

// Đổi / xoá ảnh, nằm trong khung xem ảnh lớn.
function ImageActions({ sku, onDone }: { sku: CatalogSku; onDone: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<void>, message: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(message);
        onDone();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={isPending} onClick={() => inputRef.current?.click()}>
        <Camera className="h-4 w-4" /> Đổi ảnh
      </Button>
      <Button
        variant="ghost"
        disabled={isPending}
        onClick={() => run(() => removeSkuImage(sku.id), "Đã xoá ảnh")}
      >
        <ImageOff className="h-4 w-4" /> Xoá ảnh
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          run(async () => {
            const fd = new FormData();
            fd.set("image", await resizeImage(file));
            await setSkuImage(sku.id, fd);
          }, "Đã đổi ảnh");
        }}
      />
    </div>
  );
}
