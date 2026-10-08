export type MedicineQuantity = string | number | Record<string, string | number>;

export function hasNoQuantity(quantity: MedicineQuantity | null | undefined): boolean {
  if (quantity === null || quantity === undefined) return true;
  if (typeof quantity === 'object') {
    const values = Object.values(quantity);
    return values.length === 0 || values.every((value) => Number(value) <= 0);
  }
  return Number(quantity) <= 0;
}

export function isDosageInPattern(dosage: string, dosagePattern?: string): boolean {
  if (!dosagePattern) return true;
  const doseVal = parseFloat(dosage);
  if (isNaN(doseVal)) return false;
  const patterns = dosagePattern
    .split(',')
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n));
  if (patterns.length === 0) return true;
  return patterns.some((p) => Math.abs(p - doseVal) < 0.0001);
}

export function hasNoQuantityForDose(
  quantity: MedicineQuantity | null | undefined,
  dosage: string,
  dosagePattern?: string
): boolean {
  if (quantity === null || quantity === undefined) return true;
  if (typeof quantity !== 'object') {
    // If dosage is not part of this medicine's dosage pattern, it does not draw from stock
    if (dosagePattern && !isDosageInPattern(dosage, dosagePattern)) {
      return false;
    }
    return Number(quantity) <= 0;
  }

  const key = Object.keys(quantity).find((candidate) => parseFloat(candidate) === parseFloat(dosage));
  if (key === undefined) return false;
  return Number(quantity[key]) <= 0;
}

export function decreaseQuantity(
  quantity: MedicineQuantity,
  dosage: string,
  dosagePattern?: string
): MedicineQuantity {
  if (typeof quantity !== 'object') {
    // Only decrease single medicine quantity if the dose strength matches the already defined dosage pattern
    if (dosagePattern && !isDosageInPattern(dosage, dosagePattern)) {
      return quantity;
    }
    return Math.max(0, Number(quantity) - 1);
  }

  const key = Object.keys(quantity).find((candidate) => parseFloat(candidate) === parseFloat(dosage));
  if (!key) return quantity;

  return { ...quantity, [key]: Math.max(0, Number(quantity[key]) - 1) };
}