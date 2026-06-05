import type { StockCategory, TicketStatus, Tier } from "@prisma/client";

export type Category = StockCategory;
export type AppTier = Tier;

export interface StockItemView {
  id: string;
  category: Category;
  tier: AppTier;
  quantity: number;
  total: number;
  averageCost: number;
}

export interface TicketConsumptionView {
  id: string;
  category: Category;
  tier: AppTier;
  quantity: number;
  discountedTotal: number;
  averageCostUsed: number;
}

export interface FabricationTicketView {
  id: string;
  tier: AppTier;
  status: TicketStatus;
  tax: number;
  staffQuantity: number;
  craftingTax: number;
  materialTotal: number;
  filledDiariesQuantity: number;
  filledDiariesDiscount: number;
  leftoverTablesQuantity: number;
  leftoverTablesValue: number;
  leftoverClothsQuantity: number;
  leftoverClothsValue: number;
  appliedLeftoverDiscount: number;
  investmentTotal: number;
  unitCost: number;
  openedAt: string;
  closedAt: string | null;
  consumptions: TicketConsumptionView[];
}

export interface MissingMaterial {
  category: Category;
  tier: AppTier;
  required: number;
  available: number;
}

export interface LeftoverCreditView {
  id: string;
  tier: AppTier;
  category: Category;
  quantity: number;
  value: number;
  sourceTicketId: string;
  appliedToTicketId: string | null;
  createdAt: string;
  appliedAt: string | null;
}

export interface CreatePurchaseInput {
  category: Category;
  tier: AppTier;
  quantity: number;
  total: number;
}

export type BulkPurchaseItemInput = Omit<CreatePurchaseInput, "tier">;

export interface CreateBulkPurchaseInput {
  tier: AppTier;
  purchases: BulkPurchaseItemInput[];
}

export interface CreateTicketInput {
  tier: AppTier;
  tax: number;
}

export interface CloseTicketInput {
  ticketId: string;
  filledDiariesQuantity: number;
  filledDiariesDiscount: number;
  leftoverTablesQuantity: number;
  leftoverClothsQuantity: number;
}

export interface CloseTicketResult {
  ok: boolean;
  ticket?: FabricationTicketView;
  missing?: MissingMaterial[];
}

export interface AppApi {
  listStock: () => Promise<StockItemView[]>;
  clearStock: () => Promise<StockItemView[]>;
  createPurchase: (input: CreatePurchaseInput) => Promise<StockItemView>;
  createBulkPurchase: (input: CreateBulkPurchaseInput) => Promise<StockItemView[]>;
  createTicket: (input: CreateTicketInput) => Promise<FabricationTicketView>;
  listTickets: () => Promise<FabricationTicketView[]>;
  listOpenTickets: () => Promise<FabricationTicketView[]>;
  listHistory: () => Promise<FabricationTicketView[]>;
  listPendingLeftoverCredits: (tier: AppTier) => Promise<LeftoverCreditView[]>;
  closeTicket: (input: CloseTicketInput) => Promise<CloseTicketResult>;
}
