import {
  calculateAverageCost,
  calculateQuantity,
  calculateTotal,
  formatThousands,
  normalizeThousandsInput,
  parseThousands
} from "./number-format";

export type PurchaseField = "quantity" | "averageCost" | "total";
export type PurchaseFieldOrigin = "manual" | "calculated" | null;

export interface PurchaseCalculationState {
  quantity: string;
  averageCost: string;
  total: string;
  origins: Record<PurchaseField, PurchaseFieldOrigin>;
}

export function createEmptyPurchaseCalculation(): PurchaseCalculationState {
  return {
    quantity: "",
    averageCost: "",
    total: "",
    origins: {
      quantity: null,
      averageCost: null,
      total: null
    }
  };
}

export function updatePurchaseCalculation(
  current: PurchaseCalculationState,
  field: PurchaseField,
  rawValue: string
): PurchaseCalculationState {
  const value = normalizeThousandsInput(rawValue);
  const next: PurchaseCalculationState = {
    ...current,
    [field]: value,
    origins: {
      ...current.origins,
      [field]: value.trim() === "" ? null : "manual"
    }
  };

  const quantityIsManual = next.origins.quantity === "manual";
  const averageCostIsManual = next.origins.averageCost === "manual";
  const totalIsManual = next.origins.total === "manual";

  if (averageCostIsManual && totalIsManual && !quantityIsManual) {
    return withCalculatedField(next, "quantity", calculateQuantity(parseThousands(next.total), parseThousands(next.averageCost)));
  }

  if (field === "averageCost" && quantityIsManual && averageCostIsManual) {
    return withCalculatedField(next, "total", calculateTotal(parseThousands(next.quantity), parseThousands(next.averageCost)));
  }

  if (field === "total" && quantityIsManual && totalIsManual) {
    return withCalculatedField(next, "averageCost", calculateAverageCost(parseThousands(next.quantity), parseThousands(next.total)));
  }

  if (field === "quantity" && quantityIsManual && averageCostIsManual) {
    return withCalculatedField(next, "total", calculateTotal(parseThousands(next.quantity), parseThousands(next.averageCost)));
  }

  if (field === "quantity" && quantityIsManual && totalIsManual) {
    return withCalculatedField(next, "averageCost", calculateAverageCost(parseThousands(next.quantity), parseThousands(next.total)));
  }

  return next;
}

function withCalculatedField(
  state: PurchaseCalculationState,
  field: PurchaseField,
  value: number
): PurchaseCalculationState {
  return {
    ...state,
    [field]: value > 0 ? formatThousands(String(value)) : "",
    origins: {
      ...state.origins,
      [field]: value > 0 ? "calculated" : null
    }
  };
}
