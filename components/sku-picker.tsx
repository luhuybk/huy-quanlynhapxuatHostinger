"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type SkuOption = {
  id: string;
  code: string;
  name: string;
  brandId: string;
  brandName: string;
  unitsPerCase: number;
  isQuickCreate: boolean;
};

export function SkuPicker({
  skus,
  value,
  onSelect,
}: {
  skus: SkuOption[];
  value: { skuId: string | null; skuName: string; brandId: string };
  onSelect: (v: {
    skuId: string | null;
    skuName: string;
    brandId: string;
    unitsPerCase: number;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const sorted = useMemo(
    () =>
      [...skus].sort((a, b) => {
        if (a.isQuickCreate !== b.isQuickCreate) return a.isQuickCreate ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [skus]
  );

  const exactMatch = skus.some(
    (s) => s.name.toLowerCase() === query.trim().toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {value.skuName || "Chọn hoặc nhập tên sản phẩm..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm hoặc nhập tên sản phẩm mới..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Không tìm thấy sản phẩm</CommandEmpty>
            <CommandGroup>
              {sorted
                .filter((s) =>
                  query
                    ? s.name.toLowerCase().includes(query.toLowerCase()) ||
                      s.code.toLowerCase().includes(query.toLowerCase())
                    : true
                )
                .map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.id}
                    onSelect={() => {
                      onSelect({
                        skuId: s.id,
                        skuName: s.name,
                        brandId: s.brandId,
                        unitsPerCase: s.unitsPerCase,
                      });
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.skuId === s.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.brandName} · {s.code}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              {query.trim() && !exactMatch && (
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => {
                    onSelect({
                      skuId: null,
                      skuName: query.trim(),
                      brandId: value.brandId,
                      unitsPerCase: 1,
                    });
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo mới &quot;{query.trim()}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
