import { vi } from "vitest";
import type {
  AppApi,
  AppTier,
  Category,
  FabricationTicketView,
  LeftoverCreditView,
  StockItemView
} from "../../electron/types";

type MockBlightApi = {
  [Key in keyof AppApi]: ReturnType<typeof vi.fn>;
};

export function installBlightMock() {
  const blight: MockBlightApi = {
    listStock: vi.fn(),
    clearStock: vi.fn(),
    createPurchase: vi.fn(),
    createBulkPurchase: vi.fn(),
    createTicket: vi.fn(),
    listTickets: vi.fn(),
    listOpenTickets: vi.fn(),
    listHistory: vi.fn(),
    clearHistory: vi.fn(),
    listPendingLeftoverCredits: vi.fn(),
    closeTicket: vi.fn()
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { blight }
  });

  return blight;
}

export function createStockItem(overrides: Partial<StockItemView> = {}): StockItemView {
  return {
    id: "stock-1",
    category: "TABLAS" as Category,
    tier: "T5" as AppTier,
    quantity: 10,
    total: 1000,
    averageCost: 100,
    ...overrides
  };
}

export function createTicket(overrides: Partial<FabricationTicketView> = {}): FabricationTicketView {
  return {
    id: "ticket-1",
    tier: "T5" as AppTier,
    status: "ABIERTO",
    tax: 100,
    staffQuantity: 6,
    craftingTax: 6048,
    materialTotal: 0,
    filledDiariesQuantity: 0,
    filledDiariesDiscount: 0,
    leftoverTablesQuantity: 0,
    leftoverTablesValue: 0,
    leftoverClothsQuantity: 0,
    leftoverClothsValue: 0,
    appliedLeftoverDiscount: 0,
    investmentTotal: 0,
    unitCost: 0,
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    consumptions: [],
    appliedLeftoverCredits: [],
    ...overrides
  };
}

export function createLeftoverCredit(overrides: Partial<LeftoverCreditView> = {}): LeftoverCreditView {
  return {
    id: "credit-1",
    tier: "T5" as AppTier,
    category: "TABLAS" as Category,
    quantity: 2,
    value: 200,
    sourceTicketId: "ticket-1",
    appliedToTicketId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    appliedAt: null,
    ...overrides
  };
}
