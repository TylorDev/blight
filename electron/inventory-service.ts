import {
  Prisma,
  PrismaClient,
  PurchaseInvoiceType,
  PurchaseVendor,
  StaffMovementType,
  StaffQuality,
  StockCategory,
  TicketStatus,
  Tier
} from "@prisma/client";
import type {
  AdjustStaffStockInput,
  CloseTicketInput,
  CloseTicketResult,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  CreateTicketInput,
  FabricationTicketView,
  LeftoverCreditView,
  PurchaseInvoiceView,
  SellStaffStockInput,
  StaffStockItemView,
  StaffStockLotView,
  StaffStockMovementView,
  StockItemView
} from "./types";

const categories = [
  StockCategory.TABLAS,
  StockCategory.TELAS,
  StockCategory.DIARIOS_VACIOS,
  StockCategory.ARTEFACTOS
];
const tiers = [Tier.T5, Tier.T6, Tier.T7, Tier.T8];
const staffQualities = [
  StaffQuality.NORMAL,
  StaffQuality.BUENA,
  StaffQuality.NOTABLE,
  StaffQuality.SOBRESALIENTE,
  StaffQuality.OBRA_MAESTRA
];
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
      "purchaseInvoiceId" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StockMovement_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);
    await addColumnIfMissing(prisma, "StockMovement", "purchaseInvoiceId", "INTEGER");

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PurchaseInvoice" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "type" TEXT NOT NULL,
      "vendor" TEXT NOT NULL,
      "client" TEXT NOT NULL DEFAULT 'Tylordev',
      "total" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    CREATE TABLE IF NOT EXISTS "StaffStockItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "tier" TEXT NOT NULL,
      "quality" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffStockMovement" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "tier" TEXT NOT NULL,
      "quality" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "total" REAL NOT NULL DEFAULT 0,
      "reason" TEXT,
      "ticketId" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StaffStockMovement_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffStockLot" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticketId" TEXT,
      "tier" TEXT NOT NULL,
      "quality" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "unitCost" REAL NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StaffStockLot_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TicketProducedStaff" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "ticketId" TEXT,
      "tier" TEXT NOT NULL,
      "quality" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TicketProducedStaff_ticketId_fkey"
        FOREIGN KEY ("ticketId") REFERENCES "FabricationTicket" ("id")
        ON DELETE SET NULL ON UPDATE CASCADE
    );
  `);

    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "StockItem_category_tier_key"
    ON "StockItem"("category", "tier");
  `);

    await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "StaffStockItem_tier_quality_key"
    ON "StaffStockItem"("tier", "quality");
  `);

    await ensureStockItems();
    await ensureStaffStockItems();
    await backfillPurchaseInvoices(prisma);
  }

  async function ensureStaffStockItems() {
    for (const tier of tiers) {
      for (const quality of staffQualities) {
        await prisma.staffStockItem.upsert({
          where: { tier_quality: { tier, quality } },
          update: {},
          create: { tier, quality }
        });
      }
    }
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

  async function listStaffStock(): Promise<StaffStockItemView[]> {
    await ensureStaffStockItems();
    const items = await prisma.staffStockItem.findMany({
      orderBy: [{ tier: "asc" }, { quality: "asc" }]
    });
    return items.map(toStaffStockView);
  }

  async function listStaffStockLots(): Promise<StaffStockLotView[]> {
    const lots = await prisma.staffStockLot.findMany({
      where: { quantity: { gt: 0 } },
      orderBy: { createdAt: "asc" }
    });
    return lots.map(toStaffStockLotView);
  }

  async function listStaffMovements(): Promise<StaffStockMovementView[]> {
    const movements = await prisma.staffStockMovement.findMany({
      orderBy: { createdAt: "desc" }
    });
    return movements.map(toStaffStockMovementView);
  }

  async function listPurchaseInvoices(): Promise<PurchaseInvoiceView[]> {
    const invoices = await prisma.purchaseInvoice.findMany({
      include: {
        movements: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return invoices.map(toPurchaseInvoiceView);
  }

  async function adjustStaffStock(input: AdjustStaffStockInput): Promise<StaffStockItemView> {
    validateStaffStockAdjustment(input);
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.staffStockItem.upsert({
        where: { tier_quality: { tier: input.tier, quality: input.quality } },
        update: {},
        create: { tier: input.tier, quality: input.quality }
      });
      const quantityChange = Math.trunc(input.quantity);
      const nextQuantity = current.quantity + quantityChange;
      if (nextQuantity < 0) {
        throw new Error("El ajuste no puede dejar stock negativo.");
      }

      const updated = await tx.staffStockItem.update({
        where: { id: current.id },
        data: { quantity: nextQuantity }
      });

      await tx.staffStockMovement.create({
        data: {
          type: StaffMovementType.AJUSTE,
          tier: input.tier,
          quality: input.quality,
          quantity: quantityChange,
          total: 0,
          reason: input.reason.trim()
        }
      });

      if (quantityChange > 0) {
        await tx.staffStockLot.create({
          data: {
            ticketId: null,
            tier: input.tier,
            quality: input.quality,
            quantity: quantityChange,
            unitCost: 0
          }
        });
      } else {
        await consumeStaffStockLots(tx, input.tier, input.quality, Math.abs(quantityChange));
      }

      return updated;
    });

    return toStaffStockView(item);
  }

  async function sellStaffStock(input: SellStaffStockInput): Promise<StaffStockItemView> {
    validateStaffSale(input);
    const item = await prisma.$transaction(async (tx) => {
      const current = await tx.staffStockItem.upsert({
        where: { tier_quality: { tier: input.tier, quality: input.quality } },
        update: {},
        create: { tier: input.tier, quality: input.quality }
      });
      const soldQuantity = Math.trunc(input.quantity);
      if (current.quantity < soldQuantity) {
        throw new Error("No hay bastones suficientes para vender.");
      }

      const updated = await tx.staffStockItem.update({
        where: { id: current.id },
        data: { quantity: current.quantity - soldQuantity }
      });

      await tx.staffStockMovement.create({
        data: {
          type: StaffMovementType.VENTA,
          tier: input.tier,
          quality: input.quality,
          quantity: soldQuantity,
          total: input.total,
          reason: "Venta"
        }
      });

      await consumeStaffStockLots(tx, input.tier, input.quality, soldQuantity);

      return updated;
    });

    return toStaffStockView(item);
  }

  async function createPurchase(input: CreatePurchaseInput): Promise<StockItemView> {
    if (input.quantity <= 0 || input.total <= 0) {
      throw new Error("La cantidad y el total deben ser mayores a cero.");
    }
    const vendor = normalizePurchaseVendor(input.vendor);

    const item = await prisma.$transaction(async (tx) => {
      const invoice = await tx.purchaseInvoice.create({
        data: {
          type: PurchaseInvoiceType.UNICA,
          vendor,
          client: "Tylordev",
          total: input.total
        }
      });
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
          total: input.total,
          purchaseInvoiceId: invoice.id
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
    const vendor = normalizePurchaseVendor(input.vendor);

    for (const purchase of input.purchases) {
      if (purchase.quantity <= 0 || purchase.total <= 0) {
        throw new Error("La cantidad y el total deben ser mayores a cero.");
      }
    }

    const items = await prisma.$transaction(async (tx) => {
      const updatedItems = [];
      const invoice = await tx.purchaseInvoice.create({
        data: {
          type: PurchaseInvoiceType.MASIVA,
          vendor,
          client: "Tylordev",
          total: input.purchases.reduce((total, purchase) => total + purchase.total, 0)
        }
      });

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
            total: purchase.total,
            purchaseInvoiceId: invoice.id
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

    const ticket = await prisma.$transaction(async (tx) => {
      const pendingLeftoverCredits = await tx.ticketLeftoverCredit.findMany({
        where: { tier: input.tier, appliedToTicketId: null },
        orderBy: { createdAt: "asc" }
      });
      const appliedLeftoverDiscount = pendingLeftoverCredits.reduce((total, credit) => total + credit.value, 0);
      const createdTicket = await tx.fabricationTicket.create({
        data: {
          tier: input.tier,
          tax: input.tax,
          staffQuantity,
          craftingTax: calculateCraftingTax(input.tier, input.tax),
          appliedLeftoverDiscount
        },
        include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true }
      });

      if (pendingLeftoverCredits.length > 0) {
        await tx.ticketLeftoverCredit.updateMany({
          where: { id: { in: pendingLeftoverCredits.map((credit) => credit.id) } },
          data: {
            appliedToTicketId: createdTicket.id,
            appliedAt: new Date()
          }
        });
      }

      return tx.fabricationTicket.findUniqueOrThrow({
        where: { id: createdTicket.id },
        include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true }
      });
    });

    return toTicketView(ticket);
  }

  async function listTickets(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }]
    });
    return tickets.map(toTicketView);
  }

  async function listOpenTickets(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      where: { status: TicketStatus.ABIERTO },
      include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true },
      orderBy: { openedAt: "desc" }
    });
    return tickets.map(toTicketView);
  }

  async function listHistory(): Promise<FabricationTicketView[]> {
    const tickets = await prisma.fabricationTicket.findMany({
      where: { status: TicketStatus.CERRADO },
      include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true },
      orderBy: { closedAt: "desc" }
    });
    return tickets.map(toTicketView);
  }

  async function clearHistory(): Promise<FabricationTicketView[]> {
    await prisma.$transaction(async (tx) => {
      const closedTickets = await tx.fabricationTicket.findMany({
        where: { status: TicketStatus.CERRADO },
        select: { id: true }
      });
      const ticketIds = closedTickets.map((ticket) => ticket.id);

      if (ticketIds.length === 0) {
        return;
      }

      await tx.ticketLeftoverCredit.deleteMany({
        where: {
          OR: [{ sourceTicketId: { in: ticketIds } }, { appliedToTicketId: { in: ticketIds } }]
        }
      });
      await tx.ticketConsumption.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await tx.stockMovement.deleteMany({
        where: {
          type: "CONSUMO",
          ticketId: { in: ticketIds }
        }
      });
      await tx.staffStockMovement.updateMany({
        where: { ticketId: { in: ticketIds } },
        data: { ticketId: null }
      });
      await tx.ticketProducedStaff.updateMany({
        where: { ticketId: { in: ticketIds } },
        data: { ticketId: null }
      });
      await tx.staffStockLot.updateMany({
        where: { ticketId: { in: ticketIds } },
        data: { ticketId: null }
      });
      await tx.fabricationTicket.deleteMany({ where: { id: { in: ticketIds } } });
    });

    return listHistory();
  }

  async function deleteOpenTicket(ticketId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.fabricationTicket.findUnique({
        where: { id: ticketId },
        select: { id: true, status: true }
      });

      if (!ticket) {
        throw new Error("Ticket no encontrado.");
      }

      if (ticket.status === TicketStatus.CERRADO) {
        throw new Error("No se puede eliminar un ticket cerrado.");
      }

      await tx.ticketLeftoverCredit.deleteMany({ where: { appliedToTicketId: ticket.id } });
      await tx.fabricationTicket.delete({ where: { id: ticket.id } });
    });
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
        include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true }
      });

      if (!ticket) {
        throw new Error("Ticket no encontrado.");
      }

      if (ticket.status === TicketStatus.CERRADO) {
        return { ok: true, ticket: toTicketView(ticket) };
      }

      const producedStaffs = normalizeProducedStaffInput(input.producedStaffs, ticket.staffQuantity);
      const materials = getEffectiveRecipe(ticket.tier, ticket.appliedLeftoverCredits);
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

        usedAverageCosts.set(material.category, item.averageCost);
        if (material.quantity === 0) {
          continue;
        }

        const discountedTotal = material.quantity * item.averageCost;
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
      const leftoverTablesValue = input.leftoverTablesQuantity * (usedAverageCosts.get(StockCategory.TABLAS) ?? 0);
      const leftoverClothsValue = input.leftoverClothsQuantity * (usedAverageCosts.get(StockCategory.TELAS) ?? 0);
      const investmentTotal = materialTotal + ticket.craftingTax - input.filledDiariesDiscount;
      if (investmentTotal < 0) {
        throw new Error("Los descuentos no pueden dejar la inversion total por debajo de cero.");
      }
      const unitCost = investmentTotal / ticket.staffQuantity;

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

      for (const producedStaff of producedStaffs) {
        if (producedStaff.quantity === 0) {
          continue;
        }

        const currentStaffStock = await tx.staffStockItem.upsert({
          where: { tier_quality: { tier: ticket.tier, quality: producedStaff.quality } },
          update: {},
          create: { tier: ticket.tier, quality: producedStaff.quality }
        });

        await tx.staffStockItem.update({
          where: { id: currentStaffStock.id },
          data: { quantity: currentStaffStock.quantity + producedStaff.quantity }
        });

        await tx.ticketProducedStaff.create({
          data: {
            ticketId: ticket.id,
            tier: ticket.tier,
            quality: producedStaff.quality,
            quantity: producedStaff.quantity
          }
        });

        await tx.staffStockLot.create({
          data: {
            ticketId: ticket.id,
            tier: ticket.tier,
            quality: producedStaff.quality,
            quantity: producedStaff.quantity,
            unitCost
          }
        });

        await tx.staffStockMovement.create({
          data: {
            type: StaffMovementType.PRODUCCION,
            tier: ticket.tier,
            quality: producedStaff.quality,
            quantity: producedStaff.quantity,
            total: 0,
            reason: "Produccion de ticket",
            ticketId: ticket.id
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
          appliedLeftoverDiscount: ticket.appliedLeftoverDiscount,
          investmentTotal,
          unitCost
        },
        include: { consumptions: true, appliedLeftoverCredits: true, producedStaffs: true }
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
    listStaffStock,
    listStaffStockLots,
    listStaffMovements,
    adjustStaffStock,
    sellStaffStock,
    createPurchase,
    createBulkPurchase,
    listPurchaseInvoices,
    createTicket,
    listTickets,
    listOpenTickets,
    listHistory,
    clearHistory,
    deleteOpenTicket,
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
export const listStaffStock = () => getDefaultService().listStaffStock();
export const listStaffStockLots = () => getDefaultService().listStaffStockLots();
export const listStaffMovements = () => getDefaultService().listStaffMovements();
export const adjustStaffStock = (input: AdjustStaffStockInput) => getDefaultService().adjustStaffStock(input);
export const sellStaffStock = (input: SellStaffStockInput) => getDefaultService().sellStaffStock(input);
export const createPurchase = (input: CreatePurchaseInput) => getDefaultService().createPurchase(input);
export const createBulkPurchase = (input: CreateBulkPurchaseInput) => getDefaultService().createBulkPurchase(input);
export const listPurchaseInvoices = () => getDefaultService().listPurchaseInvoices();
export const createTicket = (input: CreateTicketInput) => getDefaultService().createTicket(input);
export const listTickets = () => getDefaultService().listTickets();
export const listOpenTickets = () => getDefaultService().listOpenTickets();
export const listHistory = () => getDefaultService().listHistory();
export const clearHistory = () => getDefaultService().clearHistory();
export const deleteOpenTicket = (ticketId: string) => getDefaultService().deleteOpenTicket(ticketId);
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

function toStaffStockView(item: {
  id: string;
  tier: Tier;
  quality: StaffQuality;
  quantity: number;
}): StaffStockItemView {
  return {
    id: item.id,
    tier: item.tier,
    quality: item.quality,
    quantity: item.quantity
  };
}

function toStaffStockLotView(lot: {
  id: string;
  tier: Tier;
  quality: StaffQuality;
  quantity: number;
  unitCost: number;
  ticketId: string | null;
  createdAt: Date;
}): StaffStockLotView {
  return {
    id: lot.id,
    tier: lot.tier,
    quality: lot.quality,
    quantity: lot.quantity,
    unitCost: lot.unitCost,
    ticketId: lot.ticketId,
    ticketCode: lot.ticketId ? lot.ticketId.slice(0, 6).toUpperCase() : "-",
    createdAt: lot.createdAt.toISOString()
  };
}

function toStaffStockMovementView(movement: {
  id: string;
  type: StaffMovementType;
  tier: Tier;
  quality: StaffQuality;
  quantity: number;
  total: number;
  reason: string | null;
  ticketId: string | null;
  createdAt: Date;
}): StaffStockMovementView {
  return {
    id: movement.id,
    type: movement.type,
    tier: movement.tier,
    quality: movement.quality,
    quantity: movement.quantity,
    total: movement.total,
    reason: movement.reason,
    ticketId: movement.ticketId,
    createdAt: movement.createdAt.toISOString()
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
  appliedLeftoverCredits: Array<{
    id: string;
    tier: Tier;
    category: StockCategory;
    quantity: number;
    value: number;
    sourceTicketId: string;
    appliedToTicketId: string | null;
    createdAt: Date;
    appliedAt: Date | null;
  }>;
  producedStaffs: Array<{
    id: string;
    ticketId: string | null;
    tier: Tier;
    quality: StaffQuality;
    quantity: number;
    createdAt: Date;
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
    })),
    appliedLeftoverCredits: ticket.appliedLeftoverCredits.map(toLeftoverCreditView),
    producedStaffs: ticket.producedStaffs.map((staff) => ({
      id: staff.id,
      ticketId: staff.ticketId,
      tier: staff.tier,
      quality: staff.quality,
      quantity: staff.quantity,
      createdAt: staff.createdAt.toISOString()
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

function toPurchaseInvoiceView(invoice: {
  id: number;
  type: PurchaseInvoiceType;
  vendor: PurchaseVendor;
  client: string;
  total: number;
  createdAt: Date;
  movements: Array<{
    id: string;
    category: StockCategory;
    tier: Tier;
    quantity: number;
    total: number;
    createdAt: Date;
  }>;
}): PurchaseInvoiceView {
  return {
    id: invoice.id,
    number: `#${String(invoice.id).padStart(6, "0")}`,
    type: invoice.type,
    vendor: invoice.vendor,
    client: invoice.client,
    total: invoice.total,
    createdAt: invoice.createdAt.toISOString(),
    lines: invoice.movements.map((movement) => ({
      id: movement.id,
      category: movement.category,
      tier: movement.tier,
      quantity: movement.quantity,
      total: movement.total,
      createdAt: movement.createdAt.toISOString()
    }))
  };
}

async function backfillPurchaseInvoices(prisma: PrismaClient) {
  const movements = await prisma.stockMovement.findMany({
    where: {
      type: "COMPRA",
      purchaseInvoiceId: null
    },
    orderBy: { createdAt: "asc" }
  });

  for (const movement of movements) {
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        type: PurchaseInvoiceType.UNICA,
        vendor: PurchaseVendor.PARTICULAR,
        client: "Tylordev",
        total: movement.total,
        createdAt: movement.createdAt
      }
    });

    await prisma.stockMovement.update({
      where: { id: movement.id },
      data: { purchaseInvoiceId: invoice.id }
    });
  }
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

  if (input.leftoverTablesQuantity < 1 || input.leftoverClothsQuantity < 1) {
    throw new Error("Cantidad de Tablas Sobrantes y Cantidad de Telas Sobrantes deben ser mayores a cero.");
  }
}

function normalizeProducedStaffInput(
  producedStaffs: CloseTicketInput["producedStaffs"],
  expectedTotal: number
) {
  if (!Array.isArray(producedStaffs)) {
    throw new Error("Debes registrar los bastones creados.");
  }

  const quantitiesByQuality = new Map<StaffQuality, number>(staffQualities.map((quality) => [quality, 0]));
  for (const staff of producedStaffs) {
    if (!staffQualities.includes(staff.quality)) {
      throw new Error("Calidad de baston invalida.");
    }

    if (!Number.isFinite(staff.quantity) || staff.quantity < 0) {
      throw new Error("Las cantidades de bastones deben ser mayores o iguales a cero.");
    }

    quantitiesByQuality.set(staff.quality, (quantitiesByQuality.get(staff.quality) ?? 0) + Math.trunc(staff.quantity));
  }

  const normalized = staffQualities.map((quality) => ({
    quality,
    quantity: quantitiesByQuality.get(quality) ?? 0
  }));
  const total = normalized.reduce((sum, staff) => sum + staff.quantity, 0);
  if (total !== expectedTotal) {
    throw new Error(`La suma de bastones creados debe ser ${expectedTotal}.`);
  }

  return normalized;
}

function validateStaffStockAdjustment(input: AdjustStaffStockInput) {
  if (!tiers.includes(input.tier) || !staffQualities.includes(input.quality)) {
    throw new Error("Tier o calidad invalida.");
  }

  if (!Number.isFinite(input.quantity) || Math.trunc(input.quantity) === 0) {
    throw new Error("La cantidad del ajuste no puede ser cero.");
  }

  if (input.reason.trim() === "") {
    throw new Error("El motivo del ajuste es obligatorio.");
  }
}

function validateStaffSale(input: SellStaffStockInput) {
  if (!tiers.includes(input.tier) || !staffQualities.includes(input.quality)) {
    throw new Error("Tier o calidad invalida.");
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad vendida debe ser mayor a cero.");
  }

  if (!Number.isFinite(input.total) || input.total < 0) {
    throw new Error("El total de venta debe ser mayor o igual a cero.");
  }
}

function normalizePurchaseVendor(vendor: PurchaseVendor | undefined) {
  if (!vendor) {
    return PurchaseVendor.PARTICULAR;
  }

  if (![PurchaseVendor.PARTICULAR, PurchaseVendor.MERCADO].includes(vendor)) {
    throw new Error("Vendedor de compra invalido.");
  }

  return vendor;
}

function getRequiredQuantity(tier: Tier, category: StockCategory) {
  return recipe[tier].find((material) => material.category === category)?.quantity ?? 0;
}

function getEffectiveRecipe(
  tier: Tier,
  appliedLeftoverCredits: Array<{ category: StockCategory; quantity: number }>
) {
  const leftoverQuantities = appliedLeftoverCredits.reduce(
    (totals, credit) => {
      if (credit.category === StockCategory.TABLAS || credit.category === StockCategory.TELAS) {
        totals[credit.category] += credit.quantity;
      }
      return totals;
    },
    {
      [StockCategory.TABLAS]: 0,
      [StockCategory.TELAS]: 0
    }
  );

  return recipe[tier].map((material) => {
    if (material.category !== StockCategory.TABLAS && material.category !== StockCategory.TELAS) {
      return material;
    }

    return {
      ...material,
      quantity: Math.max(0, material.quantity - leftoverQuantities[material.category])
    };
  });
}

async function consumeStaffStockLots(
  tx: Prisma.TransactionClient,
  tier: Tier,
  quality: StaffQuality,
  quantity: number
) {
  let remaining = quantity;
  const lots = await tx.staffStockLot.findMany({
    where: {
      tier,
      quality,
      quantity: { gt: 0 }
    },
    orderBy: { createdAt: "asc" }
  });

  for (const lot of lots) {
    if (remaining <= 0) {
      break;
    }

    const consumed = Math.min(lot.quantity, remaining);
    await tx.staffStockLot.update({
      where: { id: lot.id },
      data: { quantity: lot.quantity - consumed }
    });
    remaining -= consumed;
  }

  if (remaining > 0) {
    throw new Error("No hay lotes de bastones suficientes para descontar.");
  }
}

async function addColumnIfMissing(prisma: PrismaClient, tableName: string, columnName: string, definition: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
  if (!columns.some((column) => column.name === columnName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
  }
}
