import { PrismaClient, StaffMovementType, StaffQuality, StockCategory, Tier } from "@prisma/client";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInventoryService } from "../electron/inventory-service";
import type { CloseTicketInput } from "../electron/types";

let prisma: PrismaClient;
let service: ReturnType<typeof createInventoryService>;
let dbPath: string;

beforeEach(async () => {
  dbPath = join(process.cwd(), `.test-db-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);
  process.env.DATABASE_URL = `file:${dbPath.replace(/\\/g, "/")}`;
  prisma = new PrismaClient();
  service = createInventoryService(prisma);
  await service.initializeDatabase();
});

afterEach(async () => {
  await prisma.$disconnect();
  if (existsSync(dbPath)) {
    rmSync(dbPath, { force: true });
  }
});

describe("initializeDatabase", () => {
  it("creates the schema and exactly 16 stock items idempotently", async () => {
    await service.initializeDatabase();

    const stockCount = await prisma.stockItem.count();
    const staffStockCount = await prisma.staffStockItem.count();
    const tableNames = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type = 'table'
    `;

    expect(stockCount).toBe(16);
    expect(staffStockCount).toBe(20);
    expect(tableNames.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        "StockItem",
        "StockMovement",
        "FabricationTicket",
        "TicketConsumption",
        "TicketLeftoverCredit",
        "StaffStockItem",
        "StaffStockMovement",
        "StaffStockLot",
        "TicketProducedStaff"
      ])
    );
  });
});

describe("createPurchase", () => {
  it("creates purchase movements and recalculates weighted average cost", async () => {
    const first = await service.createPurchase({
      category: StockCategory.TABLAS,
      tier: Tier.T5,
      quantity: 10,
      total: 1000
    });
    const second = await service.createPurchase({
      category: StockCategory.TABLAS,
      tier: Tier.T5,
      quantity: 5,
      total: 1000
    });

    const movements = await prisma.stockMovement.findMany({
      where: { type: "COMPRA", category: StockCategory.TABLAS, tier: Tier.T5 }
    });

    expect(first.quantity).toBe(10);
    expect(first.averageCost).toBe(100);
    expect(second.quantity).toBe(15);
    expect(second.total).toBe(2000);
    expect(second.averageCost).toBeCloseTo(133.3333, 4);
    expect(movements).toHaveLength(2);
  });

  it("truncates decimal quantities while preserving purchase total", async () => {
    const item = await service.createPurchase({
      category: StockCategory.TABLAS,
      tier: Tier.T5,
      quantity: 10.9,
      total: 1090
    });
    const movement = await prisma.stockMovement.findFirstOrThrow({
      where: { type: "COMPRA", category: StockCategory.TABLAS, tier: Tier.T5 }
    });

    expect(item.quantity).toBe(10);
    expect(item.total).toBe(1090);
    expect(item.averageCost).toBe(109);
    expect(movement).toMatchObject({ quantity: 10, total: 1090 });
  });

  it("rejects purchases with invalid quantity or total", async () => {
    await expect(
      service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 0, total: 1000 })
    ).rejects.toThrow("cantidad");
    await expect(
      service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 1, total: 0 })
    ).rejects.toThrow("total");
  });
});

describe("createBulkPurchase", () => {
  it("creates multiple purchase movements and recalculates stock in one operation", async () => {
    await service.createPurchase({
      category: StockCategory.TABLAS,
      tier: Tier.T5,
      quantity: 10,
      total: 1000
    });

    const updated = await service.createBulkPurchase({
      tier: Tier.T5,
      purchases: [
        { category: StockCategory.TABLAS, quantity: 5, total: 1000 },
        { category: StockCategory.TELAS, quantity: 4, total: 4000 }
      ]
    });
    const movements = await prisma.stockMovement.findMany({ where: { type: "COMPRA" } });
    const stock = await service.listStock();

    expect(updated).toHaveLength(2);
    expect(stockItem(stock, StockCategory.TABLAS, Tier.T5)).toMatchObject({
      quantity: 15,
      total: 2000,
      averageCost: expect.closeTo(133.3333, 4)
    });
    expect(stockItem(stock, StockCategory.TELAS, Tier.T6)).toMatchObject({
      quantity: 0,
      total: 0,
      averageCost: 0
    });
    expect(stockItem(stock, StockCategory.TELAS, Tier.T5)).toMatchObject({
      quantity: 4,
      total: 4000,
      averageCost: 1000
    });
    expect(movements.every((movement) => movement.tier === Tier.T5)).toBe(true);
    expect(movements).toHaveLength(3);
  });

  it("combines repeated categories in one bulk purchase without duplicating stock rows", async () => {
    const updated = await service.createBulkPurchase({
      tier: Tier.T5,
      purchases: [
        { category: StockCategory.TABLAS, quantity: 10, total: 1000 },
        { category: StockCategory.TABLAS, quantity: 5, total: 1000 }
      ]
    });
    const stock = await service.listStock();
    const movements = await prisma.stockMovement.findMany({
      where: { type: "COMPRA", category: StockCategory.TABLAS, tier: Tier.T5 }
    });

    expect(updated).toHaveLength(2);
    expect(stock.filter((item) => item.category === StockCategory.TABLAS && item.tier === Tier.T5)).toHaveLength(1);
    expect(stockItem(stock, StockCategory.TABLAS, Tier.T5)).toMatchObject({
      quantity: 15,
      total: 2000,
      averageCost: expect.closeTo(133.3333, 4)
    });
    expect(movements).toHaveLength(2);
  });

  it("rejects an empty bulk purchase", async () => {
    await expect(service.createBulkPurchase({ tier: Tier.T5, purchases: [] })).rejects.toThrow("No hay compras");
  });

  it("rejects invalid values", async () => {
    await expect(
      service.createBulkPurchase({
        tier: Tier.T5,
        purchases: [{ category: StockCategory.TABLAS, quantity: 0, total: 100 }]
      })
    ).rejects.toThrow("cantidad");
    await expect(
      service.createBulkPurchase({
        tier: Tier.T5,
        purchases: [{ category: StockCategory.TABLAS, quantity: 1, total: 0 }]
      })
    ).rejects.toThrow("total");
  });

  it("rolls back all rows when one bulk row fails", async () => {
    await expect(
      service.createBulkPurchase({
        tier: Tier.T5,
        purchases: [
          { category: StockCategory.TABLAS, quantity: 10, total: 1000 },
          { category: StockCategory.TELAS, quantity: -1, total: 1000 }
        ]
      })
    ).rejects.toThrow("cantidad");

    const stock = await service.listStock();
    const movements = await prisma.stockMovement.findMany();

    expect(stock.every((item) => item.quantity === 0 && item.total === 0)).toBe(true);
    expect(movements).toHaveLength(0);
  });
});

describe("clearStock", () => {
  it("sets all stock quantities, totals, and average costs to zero", async () => {
    await service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 10, total: 1000 });
    await service.createPurchase({ category: StockCategory.TELAS, tier: Tier.T6, quantity: 20, total: 4000 });

    const stock = await service.clearStock();

    expect(stock).toHaveLength(16);
    expect(stock.every((item) => item.quantity === 0 && item.total === 0 && item.averageCost === 0)).toBe(true);
  });

  it("does not delete tickets or stock movements", async () => {
    await service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 10, total: 1000 });
    await service.createTicket({ tier: Tier.T5, tax: 100 });

    await service.clearStock();

    expect(await prisma.stockMovement.count()).toBe(1);
    expect(await prisma.fabricationTicket.count()).toBe(1);
  });

  it("is idempotent", async () => {
    await service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 10, total: 1000 });

    await service.clearStock();
    const secondRun = await service.clearStock();

    expect(secondRun).toHaveLength(16);
    expect(secondRun.every((item) => item.quantity === 0 && item.total === 0 && item.averageCost === 0)).toBe(true);
  });
});

describe("tickets", () => {
  it("rejects tickets with tax outside the allowed range", async () => {
    await expect(service.createTicket({ tier: Tier.T5, tax: 0 })).rejects.toThrow("Tax");
    await expect(service.createTicket({ tier: Tier.T5, tax: 1001 })).rejects.toThrow("Tax");
  });

  it.each([
    [Tier.T5, 465 * 10.08 * 6],
    [Tier.T6, 465 * 10.08 * 1.0858 * 6],
    [Tier.T7, 465 * 10.08 * 1.1578 * 6],
    [Tier.T8, 465 * 10.08 * 1.2729 * 6]
  ])("calculates crafting tax for %s", async (tier, craftingTax) => {
    const ticket = await service.createTicket({ tier, tax: 465 });

    expect(ticket.staffQuantity).toBe(6);
    expect(ticket.craftingTax).toBeCloseTo(craftingTax, 4);
    expect(ticket.materialTotal).toBe(0);
    expect(ticket.investmentTotal).toBe(0);
    expect(ticket.unitCost).toBe(0);
  });

  it("creates open tickets with serializable dates and no consumptions", async () => {
    const ticket = await service.createTicket({ tier: Tier.T7, tax: 100 });

    expect(ticket.tier).toBe(Tier.T7);
    expect(ticket.status).toBe("ABIERTO");
    expect(ticket.tax).toBe(100);
    expect(ticket.consumptions).toEqual([]);
    expect(new Date(ticket.openedAt).toString()).not.toBe("Invalid Date");
  });

  it("deletes an open ticket without mutating stock or history", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeDelete = await service.listStock();

    await service.deleteOpenTicket(ticket.id);

    const openTickets = await service.listOpenTickets();
    const history = await service.listHistory();
    const stockAfterDelete = await service.listStock();

    expect(openTickets).toEqual([]);
    expect(history).toEqual([]);
    expect(stockAfterDelete).toEqual(stockBeforeDelete);
  });

  it("rejects deleting a missing open ticket without mutating data", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeDelete = await service.listStock();
    const openTicketsBeforeDelete = await service.listOpenTickets();

    await expect(service.deleteOpenTicket("missing")).rejects.toThrow("Ticket no encontrado");

    expect(await service.listStock()).toEqual(stockBeforeDelete);
    expect(await service.listOpenTickets()).toEqual(openTicketsBeforeDelete);
    expect(await service.listHistory()).toEqual([]);
  });

  it("rejects deleting a closed ticket", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(ticket.id));

    await expect(service.deleteOpenTicket(ticket.id)).rejects.toThrow("cerrado");
    await expect(service.listHistory()).resolves.toHaveLength(1);
  });

  it("deletes leftovers applied to an open ticket", async () => {
    await seedRecipeStock(Tier.T5, 220, 1000);
    const sourceTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(
      closeInput(sourceTicket.id, {
        leftoverTablesQuantity: 12,
        leftoverClothsQuantity: 7
      })
    );
    const openTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    expect(openTicket.appliedLeftoverCredits).toHaveLength(2);

    await service.deleteOpenTicket(openTicket.id);

    expect(await prisma.ticketLeftoverCredit.count({ where: { appliedToTicketId: openTicket.id } })).toBe(0);
    expect(await prisma.ticketLeftoverCredit.count()).toBe(0);
    expect(await service.listHistory()).toHaveLength(1);
  });

  it("blocks close when stock is missing and does not mutate stock", async () => {
    const ticket = await service.createTicket({ tier: Tier.T6, tax: 100 });
    const result = await service.closeTicket(closeInput(ticket.id));
    const stock = await service.listStock();
    const ticketAfterCloseAttempt = await prisma.fabricationTicket.findUniqueOrThrow({
      where: { id: ticket.id }
    });

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: StockCategory.TABLAS, tier: Tier.T6, required: 73, available: 0 }),
        expect.objectContaining({ category: StockCategory.TELAS, tier: Tier.T6, required: 44, available: 0 }),
        expect.objectContaining({ category: StockCategory.ARTEFACTOS, tier: Tier.T6, required: 6, available: 0 }),
        expect.objectContaining({ category: StockCategory.DIARIOS_VACIOS, tier: Tier.T6, required: 14, available: 0 })
      ])
    );
    expect(stock.every((item) => item.quantity === 0 && item.total === 0)).toBe(true);
    expect(ticketAfterCloseAttempt.status).toBe("ABIERTO");
    expect(await prisma.ticketProducedStaff.count()).toBe(0);
    expect(await prisma.staffStockMovement.count()).toBe(0);
  });

  it("closes a T5 ticket, discounts recipe stock, and records consumption history", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);

    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const result = await service.closeTicket(closeInput(ticket.id));
    const stock = await service.listStock();
    const consumptions = await prisma.ticketConsumption.findMany({ where: { ticketId: ticket.id } });
    const consumptionMovements = await prisma.stockMovement.findMany({
      where: { ticketId: ticket.id, type: "CONSUMO" }
    });

    expect(result.ok).toBe(true);
    expect(result.ticket?.status).toBe("CERRADO");
    expect(result.ticket?.closedAt).not.toBeNull();
    expect(result.ticket?.materialTotal).toBe(142000);
    expect(result.ticket?.craftingTax).toBeCloseTo(6048, 4);
    expect(result.ticket?.investmentTotal).toBeCloseTo(148048, 4);
    expect(result.ticket?.unitCost).toBeCloseTo(24674.6667, 4);
    expect(consumptions).toHaveLength(4);
    expect(consumptionMovements).toHaveLength(4);
    expect(stockItem(stock, StockCategory.TABLAS, Tier.T5)).toMatchObject({ quantity: 27, total: 27000, averageCost: 1000 });
    expect(stockItem(stock, StockCategory.TELAS, Tier.T5)).toMatchObject({ quantity: 56, total: 56000, averageCost: 1000 });
    expect(stockItem(stock, StockCategory.ARTEFACTOS, Tier.T5)).toMatchObject({ quantity: 94, total: 94000, averageCost: 1000 });
    expect(stockItem(stock, StockCategory.DIARIOS_VACIOS, Tier.T5)).toMatchObject({
      quantity: 81,
      total: 81000,
      averageCost: 1000
    });
    expect(result.ticket?.producedStaffs).toEqual([
      expect.objectContaining({ tier: Tier.T5, quality: StaffQuality.NORMAL, quantity: 6 })
    ]);
    expect(await prisma.staffStockItem.findUniqueOrThrow({
      where: { tier_quality: { tier: Tier.T5, quality: StaffQuality.NORMAL } }
    })).toMatchObject({ quantity: 6 });
    expect(await prisma.staffStockMovement.count({
      where: { type: StaffMovementType.PRODUCCION, ticketId: ticket.id }
    })).toBe(1);
    expect(await service.listStaffStockLots()).toEqual([
      expect.objectContaining({
        tier: Tier.T5,
        quality: StaffQuality.NORMAL,
        quantity: 6,
        unitCost: expect.closeTo(24674.6667, 4),
        ticketId: ticket.id,
        ticketCode: ticket.id.slice(0, 6).toUpperCase()
      })
    ]);
  });

  it("rejects closing when produced staff quantities do not match staff quantity", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    await expect(
      service.closeTicket(
        closeInput(ticket.id, {
          producedStaffs: [{ quality: StaffQuality.NORMAL, quantity: 5 }]
        })
      )
    ).rejects.toThrow("bastones");

    expect(await prisma.ticketProducedStaff.count()).toBe(0);
  });

  it("rejects discounts that would leave negative investment without mutating close state", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeClose = await service.listStock();

    await expect(
      service.closeTicket(closeInput(ticket.id, { filledDiariesDiscount: 999999 }))
    ).rejects.toThrow("inversion total");

    const ticketAfterCloseAttempt = await prisma.fabricationTicket.findUniqueOrThrow({ where: { id: ticket.id } });

    expect(ticketAfterCloseAttempt.status).toBe("ABIERTO");
    expect(await service.listStock()).toEqual(stockBeforeClose);
    expect(await prisma.ticketConsumption.count()).toBe(0);
    expect(await prisma.stockMovement.count({ where: { type: "CONSUMO" } })).toBe(0);
    expect(await prisma.ticketProducedStaff.count()).toBe(0);
    expect(await prisma.staffStockMovement.count()).toBe(0);
  });

  it("normalizes multiple produced staff qualities when closing a ticket", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    const result = await service.closeTicket(
      closeInput(ticket.id, {
        producedStaffs: [
          { quality: StaffQuality.NORMAL, quantity: 2 },
          { quality: StaffQuality.BUENA, quantity: 3 },
          { quality: StaffQuality.NOTABLE, quantity: 1 }
        ]
      })
    );
    const producedStaffs = await prisma.ticketProducedStaff.findMany({
      where: { ticketId: ticket.id },
      orderBy: { quality: "asc" }
    });
    const productionMovements = await prisma.staffStockMovement.findMany({
      where: { ticketId: ticket.id, type: StaffMovementType.PRODUCCION },
      orderBy: { quality: "asc" }
    });
    const stock = await service.listStaffStock();

    expect(result.ok).toBe(true);
    expect(producedStaffs).toHaveLength(3);
    expect(productionMovements).toHaveLength(3);
    expect(stock.find((item) => item.tier === Tier.T5 && item.quality === StaffQuality.NORMAL)?.quantity).toBe(2);
    expect(stock.find((item) => item.tier === Tier.T5 && item.quality === StaffQuality.BUENA)?.quantity).toBe(3);
    expect(stock.find((item) => item.tier === Tier.T5 && item.quality === StaffQuality.NOTABLE)?.quantity).toBe(1);
    expect(producedStaffs.reduce((total, staff) => total + staff.quantity, 0)).toBe(6);
  });

  it("aggregates duplicate produced staff qualities before persisting", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    const result = await service.closeTicket(
      closeInput(ticket.id, {
        producedStaffs: [
          { quality: StaffQuality.NORMAL, quantity: 2 },
          { quality: StaffQuality.NORMAL, quantity: 4 }
        ]
      })
    );
    const producedStaffs = await prisma.ticketProducedStaff.findMany({ where: { ticketId: ticket.id } });
    const normalStock = await prisma.staffStockItem.findUniqueOrThrow({
      where: { tier_quality: { tier: Tier.T5, quality: StaffQuality.NORMAL } }
    });

    expect(result.ok).toBe(true);
    expect(producedStaffs).toHaveLength(1);
    expect(producedStaffs[0]).toMatchObject({ quality: StaffQuality.NORMAL, quantity: 6 });
    expect(normalStock.quantity).toBe(6);
  });

  it("keeps produced staff lots separated by source ticket", async () => {
    await seedRecipeStock(Tier.T5, 220, 1000);
    const firstTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(
      closeInput(firstTicket.id, {
        producedStaffs: [{ quality: StaffQuality.BUENA, quantity: 6 }]
      })
    );
    const secondTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(
      closeInput(secondTicket.id, {
        producedStaffs: [{ quality: StaffQuality.BUENA, quantity: 6 }]
      })
    );

    const lots = await service.listStaffStockLots();

    expect(lots).toHaveLength(2);
    expect(lots.map((lot) => lot.ticketId)).toEqual([firstTicket.id, secondTicket.id]);
    expect(lots.every((lot) => lot.tier === Tier.T5 && lot.quality === StaffQuality.BUENA && lot.quantity === 6)).toBe(true);
  });

  it("rejects invalid produced staff quality without mutating close state", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeClose = await service.listStock();

    await expect(
      service.closeTicket(
        closeInput(ticket.id, {
          producedStaffs: [{ quality: "INVALIDA" as StaffQuality, quantity: 6 }]
        })
      )
    ).rejects.toThrow("Calidad de baston invalida");

    const ticketAfterCloseAttempt = await prisma.fabricationTicket.findUniqueOrThrow({ where: { id: ticket.id } });

    expect(ticketAfterCloseAttempt.status).toBe("ABIERTO");
    expect(await service.listStock()).toEqual(stockBeforeClose);
    expect(await prisma.ticketConsumption.count()).toBe(0);
    expect(await prisma.ticketProducedStaff.count()).toBe(0);
    expect(await prisma.staffStockMovement.count()).toBe(0);
  });

  it("rejects non-finite produced staff quantities without mutating close state", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeClose = await service.listStock();

    await expect(
      service.closeTicket(
        closeInput(ticket.id, {
          producedStaffs: [{ quality: StaffQuality.NORMAL, quantity: Number.NaN }]
        })
      )
    ).rejects.toThrow("cantidades de bastones");

    const ticketAfterCloseAttempt = await prisma.fabricationTicket.findUniqueOrThrow({ where: { id: ticket.id } });

    expect(ticketAfterCloseAttempt.status).toBe("ABIERTO");
    expect(await service.listStock()).toEqual(stockBeforeClose);
    expect(await prisma.ticketConsumption.count()).toBe(0);
    expect(await prisma.ticketProducedStaff.count()).toBe(0);
    expect(await prisma.staffStockMovement.count()).toBe(0);
  });

  it("truncates decimal close quantities before persisting", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    const result = await service.closeTicket(
      closeInput(ticket.id, {
        filledDiariesQuantity: 2.8,
        leftoverTablesQuantity: 1.9,
        leftoverClothsQuantity: 1.2,
        producedStaffs: [{ quality: StaffQuality.NORMAL, quantity: 6.9 }]
      })
    );
    const producedStaff = await prisma.ticketProducedStaff.findFirstOrThrow({ where: { ticketId: ticket.id } });

    expect(result.ok).toBe(true);
    expect(result.ticket).toMatchObject({
      filledDiariesQuantity: 2,
      leftoverTablesQuantity: 1,
      leftoverClothsQuantity: 1
    });
    expect(producedStaff).toMatchObject({ quality: StaffQuality.NORMAL, quantity: 6 });
  });

  it("applies filled diary discount to the ticket total", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);

    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const result = await service.closeTicket(
      closeInput(ticket.id, {
        filledDiariesQuantity: 15,
        filledDiariesDiscount: 5000
      })
    );

    expect(result.ok).toBe(true);
    expect(result.ticket?.filledDiariesQuantity).toBe(15);
    expect(result.ticket?.filledDiariesDiscount).toBe(5000);
    expect(result.ticket?.investmentTotal).toBeCloseTo(143048, 4);
    expect(result.ticket?.unitCost).toBeCloseTo(23841.3333, 4);
  });

  it("creates leftover credits without returning leftovers to stock", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);

    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const result = await service.closeTicket(
      closeInput(ticket.id, {
        leftoverTablesQuantity: 12,
        leftoverClothsQuantity: 7
      })
    );
    const secondClose = await service.closeTicket(
      closeInput(ticket.id, {
        leftoverTablesQuantity: 12,
        leftoverClothsQuantity: 7
      })
    );
    const credits = await prisma.ticketLeftoverCredit.findMany({ where: { sourceTicketId: ticket.id } });
    const stock = await service.listStock();

    expect(result.ok).toBe(true);
    expect(secondClose.ok).toBe(true);
    expect(result.ticket?.leftoverTablesQuantity).toBe(12);
    expect(result.ticket?.leftoverTablesValue).toBe(12000);
    expect(result.ticket?.leftoverClothsQuantity).toBe(7);
    expect(result.ticket?.leftoverClothsValue).toBe(7000);
    expect(credits).toHaveLength(2);
    expect(stockItem(stock, StockCategory.TABLAS, Tier.T5).quantity).toBe(27);
    expect(stockItem(stock, StockCategory.TELAS, Tier.T5).quantity).toBe(56);
  });

  it("automatically applies pending leftovers to the next ticket of the same tier once", async () => {
    await seedRecipeStock(Tier.T5, 220, 1000);

    const firstTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(
      closeInput(firstTicket.id, {
        leftoverTablesQuantity: 12,
        leftoverClothsQuantity: 7
      })
    );

    const secondTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeSecondClose = await service.listStock();
    const secondClose = await service.closeTicket(closeInput(secondTicket.id));
    const stockAfterSecondClose = await service.listStock();
    const thirdTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const thirdClose = await service.closeTicket(closeInput(thirdTicket.id));
    const appliedCredits = await prisma.ticketLeftoverCredit.findMany({
      where: { appliedToTicketId: secondTicket.id }
    });

    expect(secondTicket.appliedLeftoverCredits).toHaveLength(2);
    expect(secondTicket.appliedLeftoverDiscount).toBe(19000);
    expect(secondClose.ok).toBe(true);
    expect(secondClose.ticket?.appliedLeftoverDiscount).toBe(19000);
    expect(secondClose.ticket?.investmentTotal).toBeCloseTo(129048, 4);
    expect(secondClose.ticket?.investmentTotal).toBeCloseTo(
      (secondClose.ticket?.materialTotal ?? 0) + (secondClose.ticket?.craftingTax ?? 0),
      4
    );
    expect(stockItem(stockAfterSecondClose, StockCategory.TABLAS, Tier.T5).quantity).toBe(
      stockItem(stockBeforeSecondClose, StockCategory.TABLAS, Tier.T5).quantity - 61
    );
    expect(stockItem(stockAfterSecondClose, StockCategory.TELAS, Tier.T5).quantity).toBe(
      stockItem(stockBeforeSecondClose, StockCategory.TELAS, Tier.T5).quantity - 37
    );
    expect(appliedCredits).toHaveLength(2);
    expect(thirdClose.ok).toBe(true);
    expect(thirdClose.ticket?.appliedLeftoverDiscount).toBe(2000);
  });

  it("uses effective leftover-adjusted quantities when checking missing stock", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);

    const firstTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(firstTicket.id, { leftoverTablesQuantity: 12 }));
    await service.clearStock();
    await service.createPurchase({ category: StockCategory.TABLAS, tier: Tier.T5, quantity: 61, total: 61000 });
    await service.createPurchase({ category: StockCategory.TELAS, tier: Tier.T5, quantity: 44, total: 44000 });
    await service.createPurchase({ category: StockCategory.ARTEFACTOS, tier: Tier.T5, quantity: 6, total: 6000 });
    await service.createPurchase({
      category: StockCategory.DIARIOS_VACIOS,
      tier: Tier.T5,
      quantity: 19,
      total: 19000
    });

    const secondTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const result = await service.closeTicket(closeInput(secondTicket.id));

    expect(result.ok).toBe(true);
    expect(result.ticket?.consumptions.find((item) => item.category === StockCategory.TABLAS)?.quantity).toBe(61);
  });

  it("does not apply leftovers to another tier", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    await seedRecipeStock(Tier.T6, 100, 1000);

    const firstTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(firstTicket.id, { leftoverTablesQuantity: 12 }));

    const secondTicket = await service.createTicket({ tier: Tier.T6, tax: 100 });
    const secondClose = await service.closeTicket(closeInput(secondTicket.id));

    expect(secondClose.ok).toBe(true);
    expect(secondClose.ticket?.appliedLeftoverDiscount).toBe(0);
    expect(await prisma.ticketLeftoverCredit.count({ where: { tier: Tier.T5, appliedToTicketId: null } })).toBe(2);
  });

  it("lists pending leftover credits for the requested tier ordered by creation date", async () => {
    const sourceTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const appliedTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await prisma.ticketLeftoverCredit.createMany({
      data: [
        {
          tier: Tier.T5,
          category: StockCategory.TABLAS,
          quantity: 1,
          value: 100,
          sourceTicketId: sourceTicket.id,
          createdAt: new Date("2026-01-03T00:00:00.000Z")
        },
        {
          tier: Tier.T5,
          category: StockCategory.TELAS,
          quantity: 2,
          value: 200,
          sourceTicketId: sourceTicket.id,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        },
        {
          tier: Tier.T5,
          category: StockCategory.TABLAS,
          quantity: 3,
          value: 300,
          sourceTicketId: sourceTicket.id,
          appliedToTicketId: appliedTicket.id,
          appliedAt: new Date("2026-01-02T00:00:00.000Z"),
          createdAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          tier: Tier.T6,
          category: StockCategory.TABLAS,
          quantity: 4,
          value: 400,
          sourceTicketId: sourceTicket.id,
          createdAt: new Date("2026-01-04T00:00:00.000Z")
        }
      ]
    });

    const credits = await service.listPendingLeftoverCredits(Tier.T5);

    expect(credits).toHaveLength(2);
    expect(credits.map((credit) => credit.quantity)).toEqual([2, 1]);
    expect(credits.every((credit) => credit.tier === Tier.T5 && credit.appliedToTicketId === null)).toBe(true);
  });

  it("rejects invalid close form values", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    await expect(service.closeTicket(closeInput(ticket.id, { filledDiariesQuantity: -1 }))).rejects.toThrow("cierre");
    await expect(service.closeTicket(closeInput(ticket.id, { filledDiariesDiscount: -1 }))).rejects.toThrow("cierre");
    await expect(service.closeTicket(closeInput(ticket.id, { leftoverTablesQuantity: 0 }))).rejects.toThrow(
      "Sobrantes"
    );
    await expect(service.closeTicket(closeInput(ticket.id, { leftoverClothsQuantity: 0 }))).rejects.toThrow(
      "Sobrantes"
    );
    await expect(service.closeTicket(closeInput(ticket.id, { leftoverTablesQuantity: 74 }))).rejects.toThrow("sobras");
    await expect(service.closeTicket(closeInput(ticket.id, { leftoverClothsQuantity: 45 }))).rejects.toThrow("sobras");
  });

  it.each([
    [Tier.T6, 14],
    [Tier.T7, 8],
    [Tier.T8, 4]
  ])("uses the correct empty diary quantity for %s", async (tier, diaryQuantity) => {
    await seedRecipeStock(tier, 100, 500);

    const ticket = await service.createTicket({ tier, tax: 100 });
    const result = await service.closeTicket(closeInput(ticket.id));
    const diaryConsumption = await prisma.ticketConsumption.findFirstOrThrow({
      where: { ticketId: ticket.id, category: StockCategory.DIARIOS_VACIOS }
    });

    expect(result.ok).toBe(true);
    expect(diaryConsumption.quantity).toBe(diaryQuantity);
    expect(diaryConsumption.discountedTotal).toBe(diaryQuantity * 500);
  });

  it("does not double-discount when closing an already closed ticket", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);

    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(ticket.id));
    const secondClose = await service.closeTicket(closeInput(ticket.id));
    const stock = await service.listStock();
    const consumptions = await prisma.ticketConsumption.findMany({ where: { ticketId: ticket.id } });

    expect(secondClose.ok).toBe(true);
    expect(secondClose.ticket?.investmentTotal).toBeCloseTo(148048, 4);
    expect(consumptions).toHaveLength(4);
    expect(stockItem(stock, StockCategory.TABLAS, Tier.T5).quantity).toBe(27);
    expect(await prisma.ticketProducedStaff.count({ where: { ticketId: ticket.id } })).toBe(1);
    expect(await prisma.staffStockMovement.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it("lists tickets with ISO dates and included consumptions", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(ticket.id));

    const tickets = await service.listTickets();
    const closedTicket = tickets.find((item) => item.id === ticket.id);

    expect(closedTicket?.closedAt).toEqual(expect.any(String));
    expect(new Date(closedTicket?.closedAt ?? "").toString()).not.toBe("Invalid Date");
    expect(closedTicket?.consumptions).toHaveLength(4);
    expect(closedTicket?.investmentTotal).toBeCloseTo(148048, 4);
    expect(closedTicket?.unitCost).toBeCloseTo(24674.6667, 4);
  });

  it("sells staff stock and records a movement", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(ticket.id));

    const updated = await service.sellStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 2,
      total: 5000
    });
    const movement = await prisma.staffStockMovement.findFirstOrThrow({
      where: { type: StaffMovementType.VENTA, tier: Tier.T5, quality: StaffQuality.NORMAL }
    });

    expect(updated.quantity).toBe(4);
    expect(movement).toMatchObject({ quantity: 2, total: 5000, reason: "Venta" });
    expect(await service.listStaffStockLots()).toEqual([
      expect.objectContaining({ ticketId: ticket.id, quantity: 4 })
    ]);
  });

  it("allows selling staff stock with zero total", async () => {
    await service.adjustStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 2,
      reason: "Carga inicial"
    });

    const updated = await service.sellStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 1,
      total: 0
    });
    const movement = await prisma.staffStockMovement.findFirstOrThrow({
      where: { type: StaffMovementType.VENTA, tier: Tier.T5, quality: StaffQuality.NORMAL }
    });

    expect(updated.quantity).toBe(1);
    expect(movement).toMatchObject({ quantity: 1, total: 0, reason: "Venta" });
  });

  it("truncates decimal staff sale quantities", async () => {
    await service.adjustStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 5,
      reason: "Carga inicial"
    });

    const updated = await service.sellStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 2.9,
      total: 2900
    });
    const movement = await prisma.staffStockMovement.findFirstOrThrow({
      where: { type: StaffMovementType.VENTA, tier: Tier.T5, quality: StaffQuality.NORMAL }
    });

    expect(updated.quantity).toBe(3);
    expect(movement).toMatchObject({ quantity: 2, total: 2900 });
  });

  it("discounts staff stock lots by FIFO when selling", async () => {
    await service.adjustStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 2,
      reason: "Primer lote"
    });
    await service.adjustStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 4,
      reason: "Segundo lote"
    });

    await service.sellStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 3,
      total: 3000
    });

    const lots = await service.listStaffStockLots();

    expect(lots).toHaveLength(1);
    expect(lots[0]).toMatchObject({ tier: Tier.T5, quality: StaffQuality.NORMAL, quantity: 3, ticketId: null });
  });

  it("rejects non-finite staff sale quantities and negative totals without creating movements", async () => {
    await service.adjustStaffStock({
      tier: Tier.T5,
      quality: StaffQuality.NORMAL,
      quantity: 5,
      reason: "Carga inicial"
    });
    await prisma.staffStockMovement.deleteMany();

    await expect(
      service.sellStaffStock({
        tier: Tier.T5,
        quality: StaffQuality.NORMAL,
        quantity: Number.POSITIVE_INFINITY,
        total: 1000
      })
    ).rejects.toThrow("cantidad");
    await expect(
      service.sellStaffStock({
        tier: Tier.T5,
        quality: StaffQuality.NORMAL,
        quantity: 1,
        total: -1
      })
    ).rejects.toThrow("total");

    expect(await prisma.staffStockMovement.count()).toBe(0);
    expect((await service.listStaffStock()).find((item) => item.tier === Tier.T5 && item.quality === StaffQuality.NORMAL)?.quantity).toBe(5);
  });

  it("rejects selling more staff than available", async () => {
    await expect(
      service.sellStaffStock({ tier: Tier.T5, quality: StaffQuality.NORMAL, quantity: 1, total: 1000 })
    ).rejects.toThrow("suficientes");
  });

  it("adjusts staff stock with a reason and prevents negative stock", async () => {
    const added = await service.adjustStaffStock({
      tier: Tier.T6,
      quality: StaffQuality.NOTABLE,
      quantity: 3,
      reason: "Conteo inicial"
    });
    const removed = await service.adjustStaffStock({
      tier: Tier.T6,
      quality: StaffQuality.NOTABLE,
      quantity: -1,
      reason: "Correccion"
    });

    await expect(
      service.adjustStaffStock({
        tier: Tier.T6,
        quality: StaffQuality.NOTABLE,
        quantity: -3,
        reason: "Error"
      })
    ).rejects.toThrow("negativo");

    expect(added.quantity).toBe(3);
    expect(removed.quantity).toBe(2);
    expect(await prisma.staffStockMovement.count({ where: { type: StaffMovementType.AJUSTE } })).toBe(2);
    expect(await service.listStaffStockLots()).toEqual([
      expect.objectContaining({ tier: Tier.T6, quality: StaffQuality.NOTABLE, quantity: 2, ticketId: null, unitCost: 0 })
    ]);
  });

  it("rejects empty staff adjustment reasons without creating movements", async () => {
    await expect(
      service.adjustStaffStock({
        tier: Tier.T6,
        quality: StaffQuality.NOTABLE,
        quantity: 2,
        reason: "   "
      })
    ).rejects.toThrow("motivo");

    expect(await prisma.staffStockMovement.count()).toBe(0);
    expect((await service.listStaffStock()).find((item) => item.tier === Tier.T6 && item.quality === StaffQuality.NOTABLE)?.quantity).toBe(0);
  });

  it("truncates decimal staff adjustment quantities", async () => {
    const updated = await service.adjustStaffStock({
      tier: Tier.T6,
      quality: StaffQuality.NOTABLE,
      quantity: 2.9,
      reason: "Conteo inicial"
    });
    const movement = await prisma.staffStockMovement.findFirstOrThrow({
      where: { type: StaffMovementType.AJUSTE, tier: Tier.T6, quality: StaffQuality.NOTABLE }
    });

    expect(updated.quantity).toBe(2);
    expect(movement).toMatchObject({ quantity: 2, reason: "Conteo inicial" });
  });
});

describe("clearHistory", () => {
  it("deletes closed tickets and related history without touching open tickets or stock", async () => {
    await seedRecipeStock(Tier.T5, 220, 1000);

    const firstTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(firstTicket.id, { leftoverTablesQuantity: 12, leftoverClothsQuantity: 7 }));
    const secondTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(secondTicket.id));
    const openTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    const stockBeforeClear = await service.listStock();

    const history = await service.clearHistory();
    const openTickets = await service.listOpenTickets();
    const stockAfterClear = await service.listStock();

    expect(history).toEqual([]);
    expect(openTickets.map((ticket) => ticket.id)).toContain(openTicket.id);
    expect(await prisma.ticketConsumption.count()).toBe(0);
    expect(await prisma.ticketLeftoverCredit.count()).toBe(0);
    expect(await prisma.stockMovement.count({ where: { type: "CONSUMO" } })).toBe(0);
    expect(await prisma.stockMovement.count({ where: { type: "COMPRA" } })).toBe(4);
    expect(stockAfterClear).toEqual(stockBeforeClear);
  });

  it("unlinks staff production history without deleting staff stock", async () => {
    await seedRecipeStock(Tier.T5, 100, 1000);
    const ticket = await service.createTicket({ tier: Tier.T5, tax: 100 });
    await service.closeTicket(closeInput(ticket.id));

    await service.clearHistory();

    expect(await prisma.staffStockItem.findUniqueOrThrow({
      where: { tier_quality: { tier: Tier.T5, quality: StaffQuality.NORMAL } }
    })).toMatchObject({ quantity: 6 });
    expect(await prisma.staffStockMovement.count({ where: { ticketId: null, type: StaffMovementType.PRODUCCION } })).toBe(1);
    expect(await prisma.ticketProducedStaff.count({ where: { ticketId: null } })).toBe(1);
    expect(await prisma.staffStockLot.count({ where: { ticketId: null, quantity: 6 } })).toBe(1);
  });

  it("is a no-op when the history is already empty", async () => {
    const openTicket = await service.createTicket({ tier: Tier.T5, tax: 100 });

    const history = await service.clearHistory();
    const openTickets = await service.listOpenTickets();

    expect(history).toEqual([]);
    expect(openTickets).toHaveLength(1);
    expect(openTickets[0].id).toBe(openTicket.id);
  });
});

describe("listStaffStock", () => {
  it("initializes all tier and quality combinations when rows are missing", async () => {
    await prisma.staffStockItem.deleteMany();

    const stock = await service.listStaffStock();

    expect(stock).toHaveLength(20);
    expect(new Set(stock.map((item) => `${item.tier}:${item.quality}`)).size).toBe(20);
  });
});

describe("listStaffStockLots", () => {
  it("returns only positive lots ordered by creation date", async () => {
    await prisma.staffStockLot.createMany({
      data: [
        {
          tier: Tier.T5,
          quality: StaffQuality.NORMAL,
          quantity: 2,
          unitCost: 200,
          createdAt: new Date("2026-01-02T00:00:00.000Z")
        },
        {
          tier: Tier.T5,
          quality: StaffQuality.BUENA,
          quantity: 0,
          unitCost: 300,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        },
        {
          tier: Tier.T6,
          quality: StaffQuality.NORMAL,
          quantity: 1,
          unitCost: 100,
          createdAt: new Date("2026-01-01T00:00:00.000Z")
        }
      ]
    });

    const lots = await service.listStaffStockLots();

    expect(lots).toHaveLength(2);
    expect(lots.map((lot) => `${lot.tier}:${lot.quality}:${lot.quantity}`)).toEqual(["T6:NORMAL:1", "T5:NORMAL:2"]);
  });
});

async function seedRecipeStock(tier: Tier, quantity: number, averageCost: number) {
  for (const category of [
    StockCategory.TABLAS,
    StockCategory.TELAS,
    StockCategory.ARTEFACTOS,
    StockCategory.DIARIOS_VACIOS
  ]) {
    await service.createPurchase({
      category,
      tier,
      quantity,
      total: quantity * averageCost
    });
  }
}

function stockItem(
  stock: Awaited<ReturnType<typeof service.listStock>>,
  category: StockCategory,
  tier: Tier
) {
  return stock.find((item) => item.category === category && item.tier === tier);
}

function closeInput(ticketId: string, overrides: Partial<CloseTicketInput> = {}): CloseTicketInput {
  return {
    ticketId,
    filledDiariesQuantity: 0,
    filledDiariesDiscount: 0,
    leftoverTablesQuantity: 1,
    leftoverClothsQuantity: 1,
    producedStaffs: [{ quality: StaffQuality.NORMAL, quantity: 6 }],
    ...overrides
  };
}
