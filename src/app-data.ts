import type { AppTier, Category, StockItemView } from "../electron/types";

export const categories: Category[] = ["TABLAS", "TELAS", "DIARIOS_VACIOS", "ARTEFACTOS"];
export const tiers: AppTier[] = ["T5", "T6", "T7", "T8"];

export const tierLabels: Record<AppTier, string> = {
  T5: "T5",
  T6: "T6",
  T7: "T7",
  T8: "T8"
};

export const categoryLabels: Record<Category, string> = {
  TABLAS: "Tablas",
  TELAS: "Telas",
  DIARIOS_VACIOS: "Diarios Vacios",
  ARTEFACTOS: "Artefactos"
};

export const recipeDiary: Record<AppTier, number> = {
  T5: 19,
  T6: 14,
  T7: 8,
  T8: 4
};

export const staffQuantity = 6;
export const craftingTaxBase = 10.08;
export const craftingTaxMultipliers: Record<AppTier, number> = {
  T5: 1,
  T6: 1.0858,
  T7: 1.1578,
  T8: 1.2729
};

export const recipeBase: Array<{ category: Category; quantity: number }> = [
  { category: "TABLAS", quantity: 73 },
  { category: "TELAS", quantity: 44 },
  { category: "ARTEFACTOS", quantity: 6 }
];

export type FilterValue<T extends string> = T | "TODOS";
export type BulkPurchaseDraft = Record<Category, { quantity: string; total: string }>;

export function createEmptyBulkDraft() {
  return Object.fromEntries(
    categories.map((category) => [category, { quantity: "", total: "" }])
  ) as BulkPurchaseDraft;
}

export function calculateTicketPreview(stock: StockItemView[], tier: AppTier, rawTax: number) {
  const taxValue = Number.isFinite(rawTax) && rawTax > 0 ? rawTax : 0;
  const materials = [
    ...recipeBase,
    { category: "DIARIOS_VACIOS" as Category, quantity: recipeDiary[tier] }
  ].map((material) => {
    const stockItem = stock.find((item) => item.category === material.category && item.tier === tier);
    const averageCost = stockItem?.averageCost ?? 0;
    return {
      ...material,
      averageCost,
      subtotal: material.quantity * averageCost
    };
  });
  const materialTotal = materials.reduce((total, material) => total + material.subtotal, 0);
  const craftingTaxUnit = taxValue * craftingTaxBase * craftingTaxMultipliers[tier];
  const craftingTaxTotal = craftingTaxUnit * staffQuantity;
  const investmentTotal = materialTotal + craftingTaxTotal;

  return {
    materials,
    materialTotal,
    craftingTaxUnit,
    craftingTaxTotal,
    investmentTotal,
    unitCost: investmentTotal / staffQuantity
  };
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
