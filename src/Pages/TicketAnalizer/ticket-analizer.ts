import type {
  AppTier,
  FabricationTicketView,
  StaffQualityView,
  TicketAnalizerHistoryManualState,
  TicketAnalizerHistorySummary
} from "../../../electron/types";
import {
  staffItemPowerByTierAndQuality,
  staffQualities,
  staffQualityLabels,
  tierLabels,
  tiers
} from "../../app-data";

export const ticketAnalizerPowers = [1560, 1580, 1600, 1620, 1640, 1660, 1680, 1700, 1720] as const;
export const defaultTicketAnalizerSaleValueByPower = {
  1560: 500000,
  1580: 535000,
  1600: 550000,
  1620: 570000,
  1640: 590000,
  1660: 610000,
  1680: 900000,
  1700: 800000,
  1720: 1350000
} as const satisfies Record<TicketAnalizerPower, number>;

export type TicketAnalizerPower = (typeof ticketAnalizerPowers)[number];
export type SaleValueByPower = Record<TicketAnalizerPower, number>;
export type SaleValueExceptionKey = "T6:OBRA_MAESTRA" | "T8:NORMAL" | "T8:BUENA" | "T8:NOTABLE";
export type SaleValueExceptions = Record<SaleValueExceptionKey, number>;
export type TicketAnalizerEditOverrides = {
  quantityByTicketAndQuality?: Record<string, number>;
  unitCostByTicketId?: Record<string, number>;
};
export type TicketAnalizerTaxPercentages = {
  saleOrderTaxPercent: number;
  saleTaxPercent: number;
};

export const ticketAnalizerSaleValueExceptionLabels: Record<SaleValueExceptionKey, string> = {
  "T6:OBRA_MAESTRA": "T6 Obra Maestra",
  "T8:NORMAL": "T8 Normal",
  "T8:BUENA": "T8 Bueno",
  "T8:NOTABLE": "T8 Notable"
};

export const defaultTicketAnalizerSaleValueExceptions: SaleValueExceptions = {
  "T6:OBRA_MAESTRA": 800000,
  "T8:NORMAL": 800000,
  "T8:BUENA": 850000,
  "T8:NOTABLE": 870000
};

export type ProducedStaffAnalysis = {
  cost: number;
  itemPower: TicketAnalizerPower;
  profit: number;
  quality: StaffQualityView;
  quantity: number;
  sale: number;
  saleValue: number;
  tier: AppTier;
  ticketId: string;
  unitCost: number;
};

export type TicketAnalizerUnitCost = { tier: AppTier; unitCost: number };
export type TicketAnalizerGroupMetrics = {
  cost: number;
  profit: number;
  quantity: number;
  sale: number;
  unitCosts: TicketAnalizerUnitCost[];
};
export type TicketAnalizerFinancialSummary = {
  grossSale: number;
  netProfit: number;
  profitBeforeTaxes: number;
  taxesAndFees: number;
  totalCost: number;
  totalQuantity: number;
};

export type TicketAnalizerResult = {
  detailByTier: Array<{
    qualities: Array<{ cost: number; profit: number; quality: StaffQualityView; quantity: number; sale: number }>;
    tier: AppTier;
  }>;
  errors: string[];
  financialSummary: TicketAnalizerFinancialSummary;
  manualMode: boolean;
  powerGroups: Array<
    TicketAnalizerGroupMetrics & {
      combinations: string[];
      itemPower: TicketAnalizerPower;
      saleValue: number;
    }
  >;
  profitByQuality: Array<
    TicketAnalizerGroupMetrics & {
      quality: StaffQualityView;
    }
  >;
  profitByTier: Array<
    TicketAnalizerGroupMetrics & {
      tier: AppTier;
    }
  >;
  selectedTickets: FabricationTicketView[];
  staffRows: ProducedStaffAnalysis[];
  summaryByTicket: Array<{
    profit: number;
    quantity: number;
    sale: number;
    ticketId: string;
    tier: AppTier;
    unitCost: number;
  }>;
  totalProfit: number;
  totalSale: number;
};

export const defaultTicketAnalizerTaxPercentages: TicketAnalizerTaxPercentages = {
  saleOrderTaxPercent: 1.5,
  saleTaxPercent: 4
};

export function createDefaultSaleValueByPower(): SaleValueByPower {
  return { ...defaultTicketAnalizerSaleValueByPower };
}

export function createDefaultSaleValueExceptions(): SaleValueExceptions {
  return { ...defaultTicketAnalizerSaleValueExceptions };
}

export function createDefaultTicketAnalizerHistoryManualState(): TicketAnalizerHistoryManualState {
  return {
    effectiveSaleValueByPower: createDefaultSaleValueByPower(),
    effectiveSaleValueExceptions: createDefaultSaleValueExceptions(),
    effectiveTaxPercentages: defaultTicketAnalizerTaxPercentages,
    exceptionInputs: Object.fromEntries(Object.keys(createDefaultSaleValueExceptions()).map((key) => [key, ""])),
    quantityDrafts: {},
    saleInputsByPower: Object.fromEntries(ticketAnalizerPowers.map((power) => [power, ""])),
    saleOrderTaxInput: "",
    saleTaxInput: "",
    unitCostDrafts: {}
  };
}

export function createEmptyTicketAnalizerHistorySummary(): TicketAnalizerHistorySummary {
  return {
    grossSale: 0,
    netProfit: 0,
    profitBeforeTaxes: 0,
    taxesAndFees: 0,
    totalCost: 0,
    totalQuantity: 0
  };
}

export function getTicketAnalizerValuesFromManualState(manualState: TicketAnalizerHistoryManualState) {
  const saleValueByPower = createDefaultSaleValueByPower();
  for (const power of ticketAnalizerPowers) {
    const inputValue = manualState.saleInputsByPower[String(power)] ?? manualState.saleInputsByPower[power] ?? "";
    const parsed = parseSavedThousandsInput(inputValue);
    saleValueByPower[power] =
      parsed > 0 ? parsed : manualState.effectiveSaleValueByPower[String(power)] ?? saleValueByPower[power];
  }

  const saleValueExceptions = createDefaultSaleValueExceptions();
  for (const key of Object.keys(saleValueExceptions) as SaleValueExceptionKey[]) {
    const parsed = parseSavedThousandsInput(manualState.exceptionInputs[key] ?? "");
    saleValueExceptions[key] = parsed > 0 ? parsed : manualState.effectiveSaleValueExceptions[key] ?? saleValueExceptions[key];
  }

  const unitCostByTicketId: Record<string, number> = {};
  for (const [ticketId, draft] of Object.entries(manualState.unitCostDrafts)) {
    if (draft.trim() !== "") {
      unitCostByTicketId[ticketId] = parseSavedThousandsInput(draft);
    }
  }

  const quantityByTicketAndQuality: Record<string, number> = {};
  for (const [key, draft] of Object.entries(manualState.quantityDrafts)) {
    if (draft.trim() !== "") {
      quantityByTicketAndQuality[key] = parseSavedThousandsInput(draft);
    }
  }

  return {
    editOverrides: { quantityByTicketAndQuality, unitCostByTicketId },
    saleValueByPower,
    saleValueExceptions,
    taxPercentages: {
      saleOrderTaxPercent: parseTicketAnalizerPercentInput(
        manualState.saleOrderTaxInput,
        manualState.effectiveTaxPercentages.saleOrderTaxPercent
      ),
      saleTaxPercent: parseTicketAnalizerPercentInput(manualState.saleTaxInput, manualState.effectiveTaxPercentages.saleTaxPercent)
    }
  };
}

export function analyzeTickets(
  tickets: FabricationTicketView[],
  manualTicketIds: string[],
  saleValueByPower: SaleValueByPower,
  saleValueExceptions: SaleValueExceptions = createDefaultSaleValueExceptions(),
  editOverrides: TicketAnalizerEditOverrides = {},
  taxPercentages: TicketAnalizerTaxPercentages = defaultTicketAnalizerTaxPercentages
): TicketAnalizerResult {
  const manualIds = manualTicketIds.map((id) => id.trim()).filter(Boolean);
  const manualMode = manualIds.length > 0;
  const selectedTickets = manualMode ? selectManualTickets(tickets, manualIds) : selectLatestXlTickets(tickets);
  const errors = validateSelectedTickets(selectedTickets, manualIds, manualMode);
  const staffRows =
    errors.length === 0 ? getProducedStaffRows(selectedTickets, saleValueByPower, saleValueExceptions, editOverrides) : [];
  const summaryByTicket = getSummaryByTicket(selectedTickets, staffRows);

  return {
    detailByTier: getDetailByTier(staffRows),
    errors,
    financialSummary: calculateTicketAnalizerFinancialSummary(staffRows, taxPercentages),
    manualMode,
    powerGroups: getPowerGroups(staffRows, saleValueByPower),
    profitByQuality: getProfitByQuality(staffRows),
    profitByTier: getProfitByTier(staffRows),
    selectedTickets,
    staffRows,
    summaryByTicket,
    totalProfit: sum(staffRows.map((row) => row.profit)),
    totalSale: sum(staffRows.map((row) => row.sale))
  };
}

export function normalizeTicketAnalizerPercentInput(value: string) {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart}.${decimalPart}`;
}

export function parseTicketAnalizerPercentInput(value: string, fallback: number) {
  if (value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function parseSavedThousandsInput(value: string) {
  const normalized = value.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateTicketAnalizerFinancialSummary(
  rows: ProducedStaffAnalysis[],
  taxPercentages: TicketAnalizerTaxPercentages = defaultTicketAnalizerTaxPercentages
): TicketAnalizerFinancialSummary {
  const totalCost = sum(rows.map((row) => row.cost));
  const grossSale = sum(rows.map((row) => row.sale));
  const totalQuantity = sum(rows.map((row) => row.quantity));
  const profitBeforeTaxes = grossSale - totalCost;
  const taxesAndFees = grossSale * ((taxPercentages.saleOrderTaxPercent + taxPercentages.saleTaxPercent) / 100);

  return {
    grossSale,
    netProfit: profitBeforeTaxes - taxesAndFees,
    profitBeforeTaxes,
    taxesAndFees,
    totalCost,
    totalQuantity
  };
}

export function getSaleValueForStaff(
  tier: AppTier,
  quality: StaffQualityView,
  itemPower: TicketAnalizerPower,
  saleValueByPower: SaleValueByPower,
  saleValueExceptions: SaleValueExceptions
) {
  const exceptionKey = `${tier}:${quality}` as SaleValueExceptionKey;
  return saleValueExceptions[exceptionKey] ?? saleValueByPower[itemPower];
}

export function selectLatestXlTickets(tickets: FabricationTicketView[]) {
  return tickets
    .filter((ticket) => ticket.status === "CERRADO" && ticket.id.startsWith("XL-"))
    .slice()
    .sort((first, second) => new Date(second.closedAt ?? 0).getTime() - new Date(first.closedAt ?? 0).getTime())
    .slice(0, 4);
}

export function createTicketQualityOverrideKey(ticketId: string, quality: StaffQualityView) {
  return `${ticketId}:${quality}`;
}

function selectManualTickets(tickets: FabricationTicketView[], manualIds: string[]) {
  return manualIds
    .map((id) => tickets.find((ticket) => ticket.id === id))
    .filter((ticket): ticket is FabricationTicketView => Boolean(ticket));
}

function validateSelectedTickets(selectedTickets: FabricationTicketView[], manualIds: string[], manualMode: boolean) {
  const errors: string[] = [];

  if (manualMode && manualIds.length !== 4) {
    errors.push("Ingresa exactamente 4 ticketId manuales o deja todos los campos vacios.");
  }

  if (manualMode) {
    const foundIds = new Set(selectedTickets.map((ticket) => ticket.id));
    const missingIds = manualIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      errors.push(`Tickets no encontrados: ${missingIds.join(", ")}.`);
    }
  }

  const duplicatedIds = findDuplicates(selectedTickets.map((ticket) => ticket.id));
  if (duplicatedIds.length > 0) {
    errors.push(`Tickets duplicados: ${duplicatedIds.join(", ")}.`);
  }

  const closedTickets = selectedTickets.filter((ticket) => ticket.status === "CERRADO");
  if (closedTickets.length !== selectedTickets.length) {
    errors.push("Todos los tickets seleccionados deben estar cerrados.");
  }

  if (selectedTickets.length !== 4) {
    errors.push("Se requieren 4 tickets para analizar.");
  }

  const selectedTiers = new Set(selectedTickets.map((ticket) => ticket.tier));
  const missingTiers = tiers.filter((tier) => !selectedTiers.has(tier));
  if (missingTiers.length > 0) {
    errors.push(`Faltan tiers: ${missingTiers.map((tier) => tierLabels[tier]).join(", ")}.`);
  }

  return errors;
}

function getProducedStaffRows(
  selectedTickets: FabricationTicketView[],
  saleValueByPower: SaleValueByPower,
  saleValueExceptions: SaleValueExceptions,
  editOverrides: TicketAnalizerEditOverrides
) {
  return selectedTickets.flatMap((ticket) =>
    staffQualities
      .map((quality): ProducedStaffAnalysis | null => {
        const originalQuantity = sum(ticket.producedStaffs.filter((staff) => staff.quality === quality).map((staff) => staff.quantity));
        const quantity = editOverrides.quantityByTicketAndQuality?.[createTicketQualityOverrideKey(ticket.id, quality)] ?? originalQuantity;
        if (quantity <= 0) {
          return null;
        }

        const unitCost = editOverrides.unitCostByTicketId?.[ticket.id] ?? ticket.unitCost;
        const itemPower = staffItemPowerByTierAndQuality[ticket.tier][quality] as TicketAnalizerPower;
        const saleValue = getSaleValueForStaff(ticket.tier, quality, itemPower, saleValueByPower, saleValueExceptions);
        const sale = saleValue * quantity;
        const cost = unitCost * quantity;

        return {
          cost,
          itemPower,
          profit: sale - cost,
          quality,
          quantity,
          sale,
          saleValue,
          tier: ticket.tier,
          ticketId: ticket.id,
          unitCost
        };
      })
      .filter((row): row is ProducedStaffAnalysis => Boolean(row))
  );
}

function getPowerGroups(rows: ProducedStaffAnalysis[], saleValueByPower: SaleValueByPower) {
  return ticketAnalizerPowers.map((itemPower) => {
    const groupRows = rows.filter((row) => row.itemPower === itemPower);
    const combinations = groupRows.map((row) => `${tierLabels[row.tier]}-${staffQualityLabels[row.quality]}`);

    return {
      combinations,
      itemPower,
      saleValue: saleValueByPower[itemPower],
      ...summarizeRows(groupRows)
    };
  });
}

function getProfitByTier(rows: ProducedStaffAnalysis[]) {
  return tiers.map((tier) => {
    const tierRows = rows.filter((row) => row.tier === tier);
    return {
      tier,
      ...summarizeRows(tierRows)
    };
  });
}

function getProfitByQuality(rows: ProducedStaffAnalysis[]) {
  return staffQualities.map((quality) => {
    const qualityRows = rows.filter((row) => row.quality === quality);
    return {
      quality,
      ...summarizeRows(qualityRows)
    };
  });
}

function summarizeRows(rows: ProducedStaffAnalysis[]): TicketAnalizerGroupMetrics {
  return {
    cost: sum(rows.map((row) => row.cost)),
    profit: sum(rows.map((row) => row.profit)),
    quantity: sum(rows.map((row) => row.quantity)),
    sale: sum(rows.map((row) => row.sale)),
    unitCosts: getUnitCostsByTier(rows)
  };
}

function getDetailByTier(rows: ProducedStaffAnalysis[]) {
  return tiers.map((tier) => ({
    tier,
    qualities: staffQualities.map((quality) => {
      const qualityRows = rows.filter((row) => row.tier === tier && row.quality === quality);
      return {
        cost: sum(qualityRows.map((row) => row.cost)),
        profit: sum(qualityRows.map((row) => row.profit)),
        quality,
        quantity: sum(qualityRows.map((row) => row.quantity)),
        sale: sum(qualityRows.map((row) => row.sale))
      };
    })
  }));
}

function getSummaryByTicket(selectedTickets: FabricationTicketView[], rows: ProducedStaffAnalysis[]) {
  return tiers.map((tier) => {
    const ticket = selectedTickets.find((item) => item.tier === tier);
    const ticketRows = ticket ? rows.filter((row) => row.ticketId === ticket.id) : [];

    return {
      profit: sum(ticketRows.map((row) => row.profit)),
      quantity: sum(ticketRows.map((row) => row.quantity)),
      sale: sum(ticketRows.map((row) => row.sale)),
      ticketId: ticket?.id ?? "-",
      tier,
      unitCost: ticketRows[0]?.unitCost ?? ticket?.unitCost ?? 0
    };
  });
}

function getUnitCostsByTier(rows: ProducedStaffAnalysis[]): TicketAnalizerUnitCost[] {
  const unitCostsByTier = new Map<AppTier, number>();
  for (const row of rows) {
    if (!unitCostsByTier.has(row.tier)) {
      unitCostsByTier.set(row.tier, row.unitCost);
    }
  }

  return tiers
    .filter((tier) => unitCostsByTier.has(tier))
    .map((tier) => ({ tier, unitCost: unitCostsByTier.get(tier) ?? 0 }));
}

function findDuplicates(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }

  return [...duplicates];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
