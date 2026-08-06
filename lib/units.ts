export type UnitType = "CASE" | "UNIT";

export function toUnits(
  quantityInput: number,
  unitType: UnitType,
  unitsPerCase: number
): number {
  return unitType === "CASE" ? quantityInput * unitsPerCase : quantityInput;
}
