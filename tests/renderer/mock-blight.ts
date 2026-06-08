import { vi } from "vitest";
import type {
  AppApi,
  AppTier,
  Category,
  FabricationTicketView,
  LeftoverCreditView,
  StaffQualityView,
  StaffStockItemView,
  StaffStockLotView,
  StaffStockMovementView,
  StockItemView,
  PurchaseInvoiceView
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
    listPurchaseInvoices: vi.fn(),
    createTicket: vi.fn(),
    deleteOpenTicket: vi.fn(),
    listTickets: vi.fn(),
    listOpenTickets: vi.fn(),
    listHistory: vi.fn(),
    clearHistory: vi.fn(),
    listPendingLeftoverCredits: vi.fn(),
    closeTicket: vi.fn(),
    listStaffStock: vi.fn(),
    listStaffStockLots: vi.fn(),
    listStaffMovements: vi.fn(),
    adjustStaffStock: vi.fn(),
    sellStaffStock: vi.fn()
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { blight }
  });

  return blight;
}

export function createPurchaseInvoice(overrides: Partial<PurchaseInvoiceView> = {}): PurchaseInvoiceView {
  return {
    id: 1,
    number: "#000001",
    type: "UNICA",
    vendor: "PARTICULAR",
    client: "Tylordev",
    total: 1000,
    createdAt: "2026-01-01T00:00:00.000Z",
    lines: [
      {
        id: "movement-1",
        category: "TABLAS" as Category,
        tier: "T5" as AppTier,
        quantity: 10,
        total: 1000,
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    ...overrides
  };
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
    producedStaffs: [],
    ...overrides
  };
}

export function createStaffStockItem(overrides: Partial<StaffStockItemView> = {}): StaffStockItemView {
  return {
    id: "staff-stock-1",
    tier: "T5" as AppTier,
    quality: "NORMAL" as StaffQualityView,
    quantity: 3,
    ...overrides
  };
}

export function createStaffStockLot(overrides: Partial<StaffStockLotView> = {}): StaffStockLotView {
  return {
    id: "staff-lot-1",
    tier: "T5" as AppTier,
    quality: "NORMAL" as StaffQualityView,
    quantity: 3,
    unitCost: 1000,
    ticketId: "ticket-1",
    ticketCode: "TICKET-",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

export function createStaffStockMovement(overrides: Partial<StaffStockMovementView> = {}): StaffStockMovementView {
  return {
    id: "staff-movement-1",
    type: "PRODUCCION",
    tier: "T5" as AppTier,
    quality: "NORMAL" as StaffQualityView,
    quantity: 3,
    total: 0,
    reason: "Produccion de ticket",
    ticketId: "ticket-1",
    createdAt: "2026-01-01T00:00:00.000Z",
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
