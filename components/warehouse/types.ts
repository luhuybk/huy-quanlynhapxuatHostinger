export type ZoneLite = {
  id: string;
  code: string;
  name: string | null;
  color: string;
};

export type WarehouseLite = {
  id: string;
  name: string;
  cols: number;
  rows: number;
  layout: string;
  note: string | null;
  zones: ZoneLite[];
};

export type SkuLite = {
  id: string;
  code: string;
  name: string;
  size: string | null;
  unitsPerCase: number;
  brand: { name: string };
  zone: { id: string; code: string; color: string; warehouseId: string } | null;
};
