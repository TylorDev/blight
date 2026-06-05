import { PrismaClient, StockCategory, TicketStatus, Tier } from "@prisma/client";
import type {
  CloseTicketInput,
  CloseTicketResult,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  CreateTicketInput,
  FabricationTicketView,
  LeftoverCreditView,
  StockItemView
} from "./types";

const categories = [
  StockCategory.TABLAS,
  StockCategory.TELAS,
  StockCategory.DIARIOS_VACIOS,
  StockCategory.ARTEFACTOS
];
const tiers = [Tier.T5, Tier.T6, Tier.T7, Tier.T8];
const staffQuantity = 6;
const craftingTaxBase = 10.08;
const craftingTaxMultipliers: Record<Tier, number> = {
  [Tier.T5]: 1,
  [Tier.T6]: 1.0858,
  [Tier.T7]: 1.1578,
  [Tier.T8]: 1.2729
};

const recipe: Record<Tier, Array<{ category: StockCategory; quantity: number }>> = {
  [Tier.T5]: [
    { category: StockCategory.TABLAS, quantity: 73 },
    { category: StockCategory.TELAS, quantity: 44 },
    { category: StockCategory.ARTEFACTOS, quantity: 6 },
    { category: StockCategory.DIARIOS_VACIOS, quantity: 19 }
  ],
  [Tier.T6]: [
    { category: StockCategory.TABLAS, quantity: 73 },
    { category: StockCategory.TELAS, quantity: 44 },
    { category: StockCategory.ARTEFACTOS, quantity: 6 },
    { category: StockCategory.DIARIOS_VACIOS, quantity: 14 }
  ],
  [Tier.T7]: [
    { category: StockCategory.TABLAS, quantity: 73 },
    { category: StockCategory.TELAS, quantity: 44 },
    { category: StockCategory.ARTEFACTOS, quantity: 6 },
    { category: StockCategory.DIARIOS_VACIOS, quantity: 8 }
  ],
  [Tier.T8]: [
    { category: StockCategory.TABLAS, quantity: 73 },
    { category: StockCategory.TELAS, quantity: 44 },
    { category: StockCategory.ARTEFACTOS, quantity: 6 },
    { category: StockCategory.DIARIOS_VACIOS, quantity: 4 }
  ]
};

export function createInventoryService(prisma: PrismaClient) {
  async function ensureStockItems() {
    for (const category of categories) {
      for (const tier of tiers) {
        await prisma.stockItem.upsert({
          where: { category_tier: { category, tier } },
          update: {},
          create: { category, tier }
        });
      }
    }
  }

  async function initializeDatabase() {
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StockItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "category" TEXT NOT NULL,
      "tier" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "total" REAL NOT NULL DEFAULT 0,
      "averageCost" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FabricationTicket" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tier" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'ABIERTO',
      "tax" REAL NOT NULL DEFAULT 1,
      "staffQuantity" INTEGER NOT NULL DEFAULT 6,
      "craftingTax" REAL NOT NULL DEFAULT 0,
      "materialTotal" REAL NOT NULL DEFAULT 0,
      "investmentTotal" REAL NOT NULL DEFAULT 0,
      "unitCost" REAL NOT NULL DEFAULT 0,
      "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "closedAt" DATETIME
    );
  `);

    await addColumnIfMissing(prisma, "FabricationTicket", "tax", "REAL NOT NULL DEFAULT 1");
    await addColumnIfMissing(prisma, "FabricationTicket", "staffQuantity", "INTEGER NOT NULL DEFAULT 6");
    await addColumnIfMissing(prisma, "FabricationTicket", "craftingTax", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "materialTotal", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "filledDiariesQuantity", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "filledDiariesDiscount", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "leftoverTablesQuantity", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "leftoverTablesValue", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "leftoverClothsQuantity", "INTEGER NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "leftoverClothsValue", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "appliedLeftoverDiscount", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "investmentTotal", "REAL NOT NULL DEFAULT 0");
    await addColumnIfMissing(prisma, "FabricationTicket", "unitCost", "REAL NOT NULL DEFAULT 0");

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StockMovement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "tier" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "total" REAL NOT NULL,
      "ticketId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StockMovement_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TicketLeftoverCredit" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tier" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "value" REAL NOT NULL,
      "sourceTicketId" TEXT NOT NULL,
      "appliedToTicketId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "appliedAt" DATETIME,
      CONSTRAINT "TicketLeftoverCredit_sourceTicketId_fkey"
        FOREIGN KEY ("sourceTicketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "TicketLeftoverCredit_appliedToTicketId_fkey"
        FOREIGN KEY ("appliedToTicketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TicketConsumption" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticketId" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "tier" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "discountedTotal" REAL NOT NULL,
      "averageCostUsed" REAL NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketConsumption_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "StockItem_category_tier_key"
    ON "StockItem"("category", "tier");
  `);

    await ensureStockItems();
  }

  async function listStock(): Promise<StockItemView[]> {
    await ensureStockItems();
    const items = await prisma.stockItem.findMany({
      orderBy: [{ category: "asc" }, { tier: "asc" }]
    });
    return items.map(toStockView);
  }

  async function clearStock(): Promise<StockItemView[]> {
    const items = await prisma.$transaction(async (tx) => {
      for (const category of categories) {
        for (const tier of tiers) {
          await tx.stockItem.upsert({
            where: { category_tier: { category, tier } },
            update: {},
            create: { category, tier }
          });
        }
      }

      await tx.stockItem.updateMany({
        data: {
          quantity: 0,
          total: 0,
          averageCost: 0
        }
      });

      return tx.stockItem.findMany({
        orderBy: [{ category: "asc" }, { tier: "asc" }]
      });
    });

    return items.map(toStockView);
  }

  async function createPurchase(input: CreatePurchaseInput): Promise<StockItemView> {
    if (input.quantity <= 0 || input.total <= 0) {
      throw new Error("La cantidad y el total deben ser mayores a cero.");
    }

    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.stockItem.upsert({
        where: { category_tier: { category: input.category, tier: input.tier } },
        update: {},
        create: { category: input.category, tier: input.tier }
      });
      const quantity = current.quantity + Math.trunc(input.quantity);
      const total = current.total + input.total;
      const averageCost = quantity > 0 ? total / quantity : 0;

      const updated = await tx.stockItem.update({
        where: { id: current.id },
        data: { quantity, total, averageCost }
      });

      await tx.stockMovement.create({
        data: {
          type: "COMPRA",
          category: input.category,
          tier: input.tier,
          quantity: Math.trunc(input.quantity),
          total: input.total
        }
      });

      return updated;
    });

    return toStockView(item);
  }

  async function createBulkPurchase(input: CreateBulkPurchaseInput): Promise<StockItemView[]> {
    if (input.purchases.length === 0) {
      throw new Error("No hay compras para registrar.");
    }

    for (const purchase of input.purchases) {
      if (purchase.quantity <= 0 || purchase.total <= 0) {
        throw new Error("La cantidad y el total deben ser mayores a cero.");
      }
    }

    const items = await prisma.$transaction(async (tx) => {
      const updatedItems = [];

      for (const purchase of input.purchases) {
        const current = await tx.stockItem.upsert({
          where: { category_tier: { category: purchase.category, tier: input.tier } },
          update: {},
          create: { category: purchase.category, tier: input.tier }
        });
        const quantity = current.quantity + Math.trunc(purchase.quantity);
        const total = current.total + purchase.total;
        const averageCost = quantity > 0 ? total / quantity : 0;

        const updated = await tx.stockItem.update({
          where: { id: current.id },
          data: { quantity, total, averageCost }
        });

        await tx.stockMovement.create({
          data: {
            type: "COMPRA",
            category: purchase.category,
            tier: input.tier,
            quantity: Math.trunc(purchase.quantity),
            total: purchase.total
          }
        });

        updatedItems.push(updated);
      }

      return updatedItems;
    });

    return items.map(toStockView);
  }

  async function createTicket(input: CreateTicketInput): Promise<FabricationTicketView> {
    if (input.tax < 1 || input.tax > 1000) {
      throw new Error("Tax debe estar entre 1 y 1000.");
    }

    const ticket = await prisma.fabricationTicket.create({
      data: {
        tier: input.tier,
        tax: input.tax,
        staffQuantity,
        craftingTax: calculateCraftingTax(input.tier, input.tax)
      },
      include: { consumptions: true }
    });
    return toTicketView(ticket);
  }

  async function listTickets(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      include: { consumptions: true },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }]
    });
    return tickets.map(toTicketView);
  }

  async function listOpenTickets(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      where: { status: TicketStatus.ABIERTO },
      include: { consumptions: true },
      orderBy: { openedAt: "desc" }
    });
    return tickets.map(toTicketView);
  }

  async function listHistory(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      where: { status: TicketStatus.CERRADO },
      include: { consumptions: true },
      orderBy: { closedAt: "desc" }
    });
    return tickets.map(toTicketView);
  }

  async function listPendingLeftoverCredits(tier: Tier): Promise<LeftoverCreditView[]> {
    const credits = await prisma.ticketLeftoverCredit.findMany({
      where: { tier, appliedToTicketId: null },
      orderBy: { createdAt: "asc" }
    });
    return credits.map(toLeftoverCreditView);
  }

  async function closeTicket(input: CloseTicketInput): Promise<CloseTicketResult> {
    validateCloseTicketInput(input);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.fabricationTicket.findUnique({
        where: { id: input.ticketId },
        include: { consumptions: true }
      });

      if (!ticket) {
        throw new Error("Ticket no encontrado.");
      }

      if (ticket.status === TicketStatus.CERRADO) {
        return { ok: true, ticket: toTicketView(ticket) };
      }

      const materials = recipe[ticket.tier];
      const tablesRequired = getRequiredQuantity(ticket.tier, StockCategory.TABLAS);
      const clothsRequired = getRequiredQuantity(ticket.tier, StockCategory.TELAS);
      if (input.leftoverTablesQuantity > tablesRequired || input.leftoverClothsQuantity > clothsRequired) {
        throw new Error("Las sobras no pueden exceder la receta del ticket.");
      }

      const stock = await tx.stockItem.findMany({
        where: {
          tier: ticket.tier,
          category: { in: materials.map((material) => material.category) }
        }
      });

      const missing = materials
        .map((material) => {
          const item = stock.find((stockItem) => stockItem.category === material.category);
          return {
            category: material.category,
            tier: ticket.tier,
            required: material.quantity,
            available: item?.quantity ?? 0
          };
        })
        .filter((material) => material.available < material.required);

      if (missing.length > 0) {
        return { ok: false, missing };
      }

      const usedAverageCosts = new Map<StockCategory, number>();

      for (const material of materials) {
        const item = stock.find((stockItem) => stockItem.category === material.category);
        if (!item) {
          throw new Error("Stock incompleto.");
        }

        const discountedTotal = material.quantity * item.averageCost;
        usedAverageCosts.set(material.category, item.averageCost);
        const nextQuantity = item.quantity - material.quantity;
        const nextTotal = Math.max(0, item.total - discountedTotal);
        const nextAverageCost = nextQuantity > 0 ? nextTotal / nextQuantity : 0;

        await tx.stockItem.update({
          where: { id: item.id },
          data: {
            quantity: nextQuantity,
            total: nextTotal,
            averageCost: nextAverageCost
          }
        });

        await tx.stockMovement.create({
          data: {
            type: "CONSUMO",
            category: material.category,
            tier: ticket.tier,
            quantity: material.quantity,
            total: discountedTotal,
            ticketId: ticket.id
          }
        });

        await tx.ticketConsumption.create({
          data: {
            ticketId: ticket.id,
            category: material.category,
            tier: ticket.tier,
            quantity: material.quantity,
            discountedTotal,
            averageCostUsed: item.averageCost
          }
        });
      }

      const materialTotal = materials.reduce(
        (total, material) => {
          const item = stock.find((stockItem) => stockItem.category === material.category);
          return total + material.quantity * (item?.averageCost ?? 0);
        },
        0
      );
      const pendingLeftoverCredits = await tx.ticketLeftoverCredit.findMany({
        where: {
          tier: ticket.tier,
          appliedToTicketId: null,
          sourceTicketId: { not: ticket.id }
        },
        orderBy: { createdAt: "asc" }
      });
      const appliedLeftoverDiscount = pendingLeftoverCredits.reduce((total, credit) => total + credit.value, 0);
      const leftoverTablesValue = input.leftoverTablesQuantity * (usedAverageCosts.get(StockCategory.TABLAS) ?? 0);
      const leftoverClothsValue = input.leftoverClothsQuantity * (usedAverageCosts.get(StockCategory.TELAS) ?? 0);
      const investmentTotal = materialTotal + ticket.craftingTax - input.filledDiariesDiscount - appliedLeftoverDiscount;
      if (investmentTotal < 0) {
        throw new Error("Los descuentos no pueden dejar la inversion total por debajo de cero.");
      }
      const unitCost = investmentTotal / ticket.staffQuantity;

      for (const credit of pendingLeftoverCredits) {
        await tx.ticketLeftoverCredit.update({
          where: { id: credit.id },
          data: {
            appliedToTicketId: ticket.id,
            appliedAt: new Date()
          }
        });
      }

      if (input.leftoverTablesQuantity > 0) {
        await tx.ticketLeftoverCredit.create({
          data: {
            tier: ticket.tier,
            category: StockCategory.TABLAS,
            quantity: Math.trunc(input.leftoverTablesQuantity),
            value: leftoverTablesValue,
            sourceTicketId: ticket.id
          }
        });
      }

      if (input.leftoverClothsQuantity > 0) {
        await tx.ticketLeftoverCredit.create({
          data: {
            tier: ticket.tier,
            category: StockCategory.TELAS,
            quantity: Math.trunc(input.leftoverClothsQuantity),
            value: leftoverClothsValue,
            sourceTicketId: ticket.id
          }
        });
      }

      const closedTicket = await tx.fabricationTicket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.CERRADO,
          closedAt: new Date(),
          materialTotal,
          filledDiariesQuantity: Math.trunc(input.filledDiariesQuantity),
          filledDiariesDiscount: input.filledDiariesDiscount,
          leftoverTablesQuantity: Math.trunc(input.leftoverTablesQuantity),
          leftoverTablesValue,
          leftoverClothsQuantity: Math.trunc(input.leftoverClothsQuantity),
          leftoverClothsValue,
          appliedLeftoverDiscount,
          investmentTotal,
          unitCost
        },
        include: { consumptions: true }
      });

      return { ok: true, ticket: toTicketView(closedTicket) };
    });

    return result;
  }

  async function disconnectPrisma() {
    await prisma.$disconnect();
  }

  return {
    ensureStockItems,
    initializeDatabase,
    listStock,
    clearStock,
    createPurchase,
    createBulkPurchase,
    createTicket,
    listTickets,
    listOpenTickets,
    listHistory,
    listPendingLeftoverCredits,
    closeTicket,
    disconnectPrisma
  };
}

let defaultService: ReturnType<typeof createInventoryService> | null = null;

function getDefaultService() {
  defaultService ??= createInventoryService(new PrismaClient());
  return defaultService;
}

export const ensureStockItems = () => getDefaultService().ensureStockItems();
export const initializeDatabase = () => getDefaultService().initializeDatabase();
export const listStock = () => getDefaultService().listStock();
export const clearStock = () => getDefaultService().clearStock();
export const createPurchase = (input: CreatePurchaseInput) => getDefaultService().createPurchase(input);
export const createBulkPurchase = (input: CreateBulkPurchaseInput) => getDefaultService().createBulkPurchase(input);
export const createTicket = (input: CreateTicketInput) => getDefaultService().createTicket(input);
export const listTickets = () => getDefaultService().listTickets();
export const listOpenTickets = () => getDefaultService().listOpenTickets();
export const listHistory = () => getDefaultService().listHistory();
export const listPendingLeftoverCredits = (tier: Tier) => getDefaultService().listPendingLeftoverCredits(tier);
export const closeTicket = (input: CloseTicketInput) => getDefaultService().closeTicket(input);
export const disconnectPrisma = () => getDefaultService().disconnectPrisma();

function toStockView(item: {
  id: string;
  category: StockCategory;
  tier: Tier;
  quantity: number;
  total: number;
  averageCost: number;
}): StockItemView {
  return {
    id: item.id,
    category: item.category,
    tier: item.tier,
    quantity: item.quantity,
    total: item.total,
    averageCost: item.averageCost
  };
}

function toTicketView(ticket: {
  id: string;
  tier: Tier;
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
  openedAt: Date;
  closedAt: Date | null;
  consumptions: Array<{
    id: string;
    category: StockCategory;
    tier: Tier;
    quantity: number;
    discountedTotal: number;
    averageCostUsed: number;
  }>;
}): FabricationTicketView {
  return {
    id: ticket.id,
    tier: ticket.tier,
    status: ticket.status,
    tax: ticket.tax,
    staffQuantity: ticket.staffQuantity,
    craftingTax: ticket.craftingTax,
    materialTotal: ticket.materialTotal,
    filledDiariesQuantity: ticket.filledDiariesQuantity,
    filledDiariesDiscount: ticket.filledDiariesDiscount,
    leftoverTablesQuantity: ticket.leftoverTablesQuantity,
    leftoverTablesValue: ticket.leftoverTablesValue,
    leftoverClothsQuantity: ticket.leftoverClothsQuantity,
    leftoverClothsValue: ticket.leftoverClothsValue,
    appliedLeftoverDiscount: ticket.appliedLeftoverDiscount,
    investmentTotal: ticket.investmentTotal,
    unitCost: ticket.unitCost,
    openedAt: ticket.openedAt.toISOString(),
    closedAt: ticket.closedAt?.toISOString() ?? null,
    consumptions: ticket.consumptions.map((consumption) => ({
      id: consumption.id,
      category: consumption.category,
      tier: consumption.tier,
      quantity: consumption.quantity,
      discountedTotal: consumption.discountedTotal,
      averageCostUsed: consumption.averageCostUsed
    }))
  };
}

function toLeftoverCreditView(credit: {
  id: string;
  tier: Tier;
  category: StockCategory;
  quantity: number;
  value: number;
  sourceTicketId: string;
  appliedToTicketId: string | null;
  createdAt: Date;
  appliedAt: Date | null;
}): LeftoverCreditView {
  return {
    id: credit.id,
    tier: credit.tier,
    category: credit.category,
    quantity: credit.quantity,
    value: credit.value,
    sourceTicketId: credit.sourceTicketId,
    appliedToTicketId: credit.appliedToTicketId,
    createdAt: credit.createdAt.toISOString(),
    appliedAt: credit.appliedAt?.toISOString() ?? null
  };
}

function calculateCraftingTax(tier: Tier, tax: number) {
  return tax * craftingTaxBase * craftingTaxMultipliers[tier] * staffQuantity;
}

function validateCloseTicketInput(input: CloseTicketInput) {
  const values = [
    input.filledDiariesQuantity,
    input.filledDiariesDiscount,
    input.leftoverTablesQuantity,
    input.leftoverClothsQuantity
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Los valores de cierre deben ser mayores o iguales a cero.");
  }
}

function getRequiredQuantity(tier: Tier, category: StockCategory) {
  return recipe[tier].find((material) => material.category === category)?.quantity ?? 0;
}

async function addColumnIfMissing(prisma: PrismaClient, tableName: string, columnName: string, definition: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
  if (!columns.some((column) => column.name === columnName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
  }
}
