export function formatThousands(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

  if (digits === "") {
    return "";
  }

  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function normalizeThousandsInput(value: string): string {
  return formatThousands(value);
}

export function parseThousands(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? 0 : Number(digits);
}

export function calculateAverageCost(quantity: number, total: number): number {
  if (quantity <= 0 || total <= 0) {
    return 0;
  }

  return Math.trunc(total / quantity);
}

export function calculateTotal(quantity: number, averageCost: number): number {
  if (quantity <= 0 || averageCost <= 0) {
    return 0;
  }

  return quantity * averageCost;
}

export function calculateQuantity(total: number, averageCost: number): number {
  if (total <= 0 || averageCost <= 0) {
    return 0;
  }

  return Math.trunc(total / averageCost);
}
