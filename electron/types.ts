import type {
  PurchaseInvoiceType,
  PurchaseVendor,
  StaffMovementType,
  StaffQuality,
  StockCategory,
  TicketStatus,
  Tier
} from "@prisma/client";

export type Category = StockCategory;
export type AppTier = Tier;
export type StaffQualityView = StaffQuality;
export type StaffMovementTypeView = StaffMovementType;
export type PurchaseInvoiceTypeView = PurchaseInvoiceType;
export type PurchaseVendorView = PurchaseVendor;

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

export interface TicketProducedStaffView {
  id: string;
  ticketId: string | null;
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
  createdAt: string;
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
  appliedLeftoverCredits: LeftoverCreditView[];
  producedStaffs: TicketProducedStaffView[];
}

export interface StaffStockItemView {
  id: string;
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
}

export interface StaffStockMovementView {
  id: string;
  type: StaffMovementTypeView;
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
  total: number;
  reason: string | null;
  ticketId: string | null;
  createdAt: string;
}

export interface StaffStockLotView {
  id: string;
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
  unitCost: number;
  ticketId: string | null;
  ticketCode: string;
  createdAt: string;
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

export interface PurchaseInvoiceLineView {
  id: string;
  category: Category;
  tier: AppTier;
  quantity: number;
  total: number;
  createdAt: string;
}

export interface PurchaseInvoiceView {
  id: number;
  number: string;
  type: PurchaseInvoiceTypeView;
  vendor: PurchaseVendorView;
  client: string;
  total: number;
  createdAt: string;
  lines: PurchaseInvoiceLineView[];
}

export interface CreatePurchaseInput {
  category: Category;
  tier: AppTier;
  quantity: number;
  total: number;
  vendor?: PurchaseVendorView;
}

export type BulkPurchaseItemInput = Omit<CreatePurchaseInput, "tier" | "vendor">;

export interface CreateBulkPurchaseInput {
  tier: AppTier;
  vendor?: PurchaseVendorView;
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
  producedStaffs: Array<{ quality: StaffQualityView; quantity: number }>;
}

export interface CloseTicketResult {
  ok: boolean;
  ticket?: FabricationTicketView;
  missing?: MissingMaterial[];
}

export interface AdjustStaffStockInput {
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
  reason: string;
}

export interface SellStaffStockInput {
  tier: AppTier;
  quality: StaffQualityView;
  quantity: number;
  total: number;
}

export interface AppApi {
  listStock: () => Promise<StockItemView[]>;
  clearStock: () => Promise<StockItemView[]>;
  createPurchase: (input: CreatePurchaseInput) => Promise<StockItemView>;
  createBulkPurchase: (input: CreateBulkPurchaseInput) => Promise<StockItemView[]>;
  listPurchaseInvoices: () => Promise<PurchaseInvoiceView[]>;
  createTicket: (input: CreateTicketInput) => Promise<FabricationTicketView>;
  deleteOpenTicket: (ticketId: string) => Promise<void>;
  listTickets: () => Promise<FabricationTicketView[]>;
  listOpenTickets: () => Promise<FabricationTicketView[]>;
  listHistory: () => Promise<FabricationTicketView[]>;
  clearHistory: () => Promise<FabricationTicketView[]>;
  listPendingLeftoverCredits: (tier: AppTier) => Promise<LeftoverCreditView[]>;
  closeTicket: (input: CloseTicketInput) => Promise<CloseTicketResult>;
  listStaffStock: () => Promise<StaffStockItemView[]>;
  listStaffStockLots: () => Promise<StaffStockLotView[]>;
  listStaffMovements: () => Promise<StaffStockMovementView[]>;
  adjustStaffStock: (input: AdjustStaffStockInput) => Promise<StaffStockItemView>;
  sellStaffStock: (input: SellStaffStockInput) => Promise<StaffStockItemView>;
}
