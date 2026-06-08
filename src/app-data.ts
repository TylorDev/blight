import type {
  AppTier,
  Category,
  FabricationTicketView,
  LeftoverCreditView,
  PurchaseVendorView,
  StaffMovementTypeView,
  StaffQualityView,
  StockItemView
} from "../electron/types";
import { createEmptyPurchaseCalculation, type PurchaseCalculationState } from "./purchase-calculator";

export const categories: Category[] = ["TABLAS", "TELAS", "DIARIOS_VACIOS", "ARTEFACTOS"];
export const tiers: AppTier[] = ["T5", "T6", "T7", "T8"];
export const staffQualities: StaffQualityView[] = [
  "NORMAL",
  "BUENA",
  "NOTABLE",
  "SOBRESALIENTE",
  "OBRA_MAESTRA"
];
export const purchaseVendors: PurchaseVendorView[] = ["PARTICULAR", "MERCADO"];

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

export const staffQualityLabels: Record<StaffQualityView, string> = {
  NORMAL: "Normal",
  BUENA: "Buena",
  NOTABLE: "Notable",
  SOBRESALIENTE: "Sobresaliente",
  OBRA_MAESTRA: "Obra Maestra"
};

export const purchaseVendorLabels: Record<PurchaseVendorView, string> = {
  PARTICULAR: "Particular",
  MERCADO: "Mercado"
};

export const staffQualityToneClasses: Record<StaffQualityView, string> = {
  NORMAL: "quality-tone--normal",
  BUENA: "quality-tone--buena",
  NOTABLE: "quality-tone--notable",
  SOBRESALIENTE: "quality-tone--sobresaliente",
  OBRA_MAESTRA: "quality-tone--obra-maestra"
};

export const staffMovementTypeLabels: Record<StaffMovementTypeView, string> = {
  PRODUCCION: "Produccion",
  AJUSTE: "Ajuste",
  VENTA: "Venta"
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
export type BulkPurchaseDraft = Record<Category, PurchaseCalculationState>;

export function createEmptyBulkDraft() {
  return Object.fromEntries(
    categories.map((category) => [category, createEmptyPurchaseCalculation()])
  ) as BulkPurchaseDraft;
}

export function getEffectiveRecipeMaterials(tier: AppTier, leftoverCredits: LeftoverCreditView[] = []) {
  const leftoverQuantities = leftoverCredits.reduce(
    (totals, credit) => {
      if (credit.category === "TABLAS" || credit.category === "TELAS") {
        totals[credit.category] += credit.quantity;
      }
      return totals;
    },
    { TABLAS: 0, TELAS: 0 }
  );

  return [
    ...recipeBase.map((material) => {
      if (material.category !== "TABLAS" && material.category !== "TELAS") {
        return material;
      }

      return {
        ...material,
        quantity: Math.max(0, material.quantity - leftoverQuantities[material.category])
      };
    }),
    { category: "DIARIOS_VACIOS" as Category, quantity: recipeDiary[tier] }
  ];
}

export function calculateTicketPreview(
  stock: StockItemView[],
  tier: AppTier,
  rawTax: number,
  leftoverCredits: LeftoverCreditView[] = []
) {
  const taxValue = Number.isFinite(rawTax) && rawTax > 0 ? rawTax : 0;
  const materials = getEffectiveRecipeMaterials(tier, leftoverCredits).map((material) => {
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

export function getDefaultTicketTax(tickets: FabricationTicketView[]) {
  return getLatestClosedTicket(tickets)?.tax ?? 1;
}

export function getDefaultFilledDiariesQuantity(tier: AppTier) {
  return recipeDiary[tier];
}

export function getDefaultFilledDiariesDiscount(tickets: FabricationTicketView[], tier: AppTier) {
  return getLatestClosedTicket(tickets, tier)?.filledDiariesDiscount ?? 0;
}

export function getRecentLeftoverQuantitySuggestions(
  tickets: FabricationTicketView[],
  tier: AppTier,
  category: Extract<Category, "TABLAS" | "TELAS">
) {
  const seen = new Set<number>();
  return getClosedTicketsByRecentDate(tickets)
    .filter((ticket) => ticket.tier === tier)
    .map((ticket) => (category === "TABLAS" ? ticket.leftoverTablesQuantity : ticket.leftoverClothsQuantity))
    .filter((quantity) => {
      if (quantity < 1 || seen.has(quantity)) {
        return false;
      }

      seen.add(quantity);
      return true;
    });
}

function getLatestClosedTicket(tickets: FabricationTicketView[], tier?: AppTier) {
  return getClosedTicketsByRecentDate(tickets).find((ticket) => !tier || ticket.tier === tier);
}

function getClosedTicketsByRecentDate(tickets: FabricationTicketView[]) {
  return tickets
    .filter((ticket) => ticket.status === "CERRADO" && ticket.closedAt)
    .slice()
    .sort((first, second) => new Date(second.closedAt ?? 0).getTime() - new Date(first.closedAt ?? 0).getTime());
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
