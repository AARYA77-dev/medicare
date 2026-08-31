export type MedicineQuantity = string | number | Record<string, string | number>;

export function hasNoQuantity(quantity: MedicineQuantity | null | undefined): boolean {
  if (quantity === null || quantity === undefined) return true;
  if (typeof quantity === 'object') {
    const values = Object.values(quantity);
    return values.length === 0 || values.every((value) => Number(value) <= 0);
  }
  return Number(quantity) <= 0;
}

export function hasNoQuantityForDose(
  quantity: MedicineQuantity | null | undefined,
  dosage: string
): boolean {
  if (quantity === null || quantity === undefined) return true;
  if (typeof quantity !== 'object') return Number(quantity) <= 0;

  const key = Object.keys(quantity).find((candidate) => parseFloat(candidate) === parseFloat(dosage));
  return key === undefined || Number(quantity[key]) <= 0;
}

export function decreaseQuantity(quantity: MedicineQuantity, dosage: string): MedicineQuantity {
  if (typeof quantity !== 'object') return Math.max(0, Number(quantity) - 1);

  const key = Object.keys(quantity).find((candidate) => parseFloat(candidate) === parseFloat(dosage));
  if (!key) return quantity;

  return { ...quantity, [key]: Math.max(0, Number(quantity[key]) - 1) };
}