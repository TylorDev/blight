import { PrismaClient, PurchaseInvoiceType, PurchaseVendor, StaffQuality, StockCategory, Tier } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
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
      "filledDiariesQuantity" INTEGER NOT NULL DEFAULT 0,
      "filledDiariesDiscount" REAL NOT NULL DEFAULT 0,
      "leftoverTablesQuantity" INTEGER NOT NULL DEFAULT 0,
      "leftoverTablesValue" REAL NOT NULL DEFAULT 0,
      "leftoverClothsQuantity" INTEGER NOT NULL DEFAULT 0,
      "leftoverClothsValue" REAL NOT NULL DEFAULT 0,
      "appliedLeftoverDiscount" REAL NOT NULL DEFAULT 0,
      "investmentTotal" REAL NOT NULL DEFAULT 0,
      "unitCost" REAL NOT NULL DEFAULT 0,
      "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "closedAt" DATETIME
    );
  `);
  await addColumnIfMissing("FabricationTicket", "tax", "REAL NOT NULL DEFAULT 1");
  await addColumnIfMissing("FabricationTicket", "staffQuantity", "INTEGER NOT NULL DEFAULT 6");
  await addColumnIfMissing("FabricationTicket", "craftingTax", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "materialTotal", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "filledDiariesQuantity", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "filledDiariesDiscount", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "leftoverTablesQuantity", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "leftoverTablesValue", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "leftoverClothsQuantity", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "leftoverClothsValue", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "appliedLeftoverDiscount", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "investmentTotal", "REAL NOT NULL DEFAULT 0");
  await addColumnIfMissing("FabricationTicket", "unitCost", "REAL NOT NULL DEFAULT 0");
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
  await addColumnIfMissing("StockMovement", "purchaseInvoiceId", "INTEGER");
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
    CREATE UNIQUE INDEX IF NOT EXISTS "StockItem_category_tier_key"
    ON "StockItem"("category", "tier");
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
    CREATE UNIQUE INDEX IF NOT EXISTS "StaffStockItem_tier_quality_key"
    ON "StaffStockItem"("tier", "quality");
  `);

  for (const category of categories) {
    for (const tier of tiers) {
      await prisma.stockItem.upsert({
        where: { category_tier: { category, tier } },
        update: {},
        create: { category, tier }
      });
    }
  }

  for (const tier of tiers) {
    for (const quality of staffQualities) {
      await prisma.staffStockItem.upsert({
        where: { tier_quality: { tier, quality } },
        update: {},
        create: { tier, quality }
      });
    }
  }

  await backfillPurchaseInvoices();
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
  if (!columns.some((column) => column.name === columnName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition}`);
  }
}

async function backfillPurchaseInvoices() {
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
