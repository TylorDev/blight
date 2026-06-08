import { beforeEach, describe, expect, it } from "vitest";
import type { AppTier, Category } from "../../electron/types";
import { usePurchaseStore } from "../../src/stores/purchase-store";
import { useStockStore } from "../../src/stores/stock-store";
import { createStockItem, installBlightMock } from "./mock-blight";

let blight: ReturnType<typeof installBlightMock>;

beforeEach(() => {
  blight = installBlightMock();
  useStockStore.setState({
    stock: [],
    loading: false,
    error: null,
    categoryFilter: "TODOS",
    tierFilter: "TODOS"
  });
  usePurchaseStore.setState({ invoices: [], loading: false, error: null });
  blight.listPurchaseInvoices.mockResolvedValue([]);
});

describe("stock-store", () => {
  it("loads stock from window.blight", async () => {
    const stock = [createStockItem()];
    blight.listStock.mockResolvedValue(stock);

    await useStockStore.getState().loadStock();

    expect(blight.listStock).toHaveBeenCalledTimes(1);
    expect(useStockStore.getState().stock).toEqual(stock);
    expect(useStockStore.getState().loading).toBe(false);
    expect(useStockStore.getState().error).toBeNull();
  });

  it("creates a purchase and refreshes stock", async () => {
    const nextStock = [createStockItem({ quantity: 11, total: 1200 })];
    blight.createPurchase.mockResolvedValue(createStockItem());
    blight.listStock.mockResolvedValue(nextStock);

    await useStockStore.getState().createPurchase({
      category: "TABLAS" as Category,
      tier: "T5" as AppTier,
      quantity: 1,
      total: 200
    });

    expect(blight.createPurchase).toHaveBeenCalledWith({
      category: "TABLAS",
      tier: "T5",
      quantity: 1,
      total: 200
    });
    expect(blight.listStock).toHaveBeenCalledTimes(1);
    expect(blight.listPurchaseInvoices).toHaveBeenCalledTimes(1);
    expect(useStockStore.getState().stock).toEqual(nextStock);
  });

  it("stores and rethrows create purchase errors without refreshing stock", async () => {
    const failure = new Error("purchase failed");
    blight.createPurchase.mockRejectedValue(failure);

    await expect(
      useStockStore.getState().createPurchase({
        category: "TABLAS" as Category,
        tier: "T5" as AppTier,
        quantity: 1,
        total: 200
      })
    ).rejects.toThrow("purchase failed");

    expect(useStockStore.getState().error).toBe("purchase failed");
    expect(blight.listStock).not.toHaveBeenCalled();
  });

  it("creates a bulk purchase and refreshes stock", async () => {
    const nextStock = [createStockItem({ category: "TELAS" as Category, quantity: 3 })];
    blight.createBulkPurchase.mockResolvedValue(nextStock);
    blight.listStock.mockResolvedValue(nextStock);

    await useStockStore.getState().createBulkPurchase({
      tier: "T6" as AppTier,
      purchases: [{ category: "TELAS" as Category, quantity: 3, total: 900 }]
    });

    expect(blight.createBulkPurchase).toHaveBeenCalledWith({
      tier: "T6",
      purchases: [{ category: "TELAS", quantity: 3, total: 900 }]
    });
    expect(blight.listStock).toHaveBeenCalledTimes(1);
    expect(blight.listPurchaseInvoices).toHaveBeenCalledTimes(1);
    expect(useStockStore.getState().stock).toEqual(nextStock);
  });

  it("stores and rethrows bulk purchase errors without refreshing stock", async () => {
    const failure = new Error("bulk purchase failed");
    blight.createBulkPurchase.mockRejectedValue(failure);

    await expect(
      useStockStore.getState().createBulkPurchase({
        tier: "T6" as AppTier,
        purchases: [{ category: "TELAS" as Category, quantity: 3, total: 900 }]
      })
    ).rejects.toThrow("bulk purchase failed");

    expect(useStockStore.getState().error).toBe("bulk purchase failed");
    expect(blight.listStock).not.toHaveBeenCalled();
  });

  it("clears stock with the API response", async () => {
    const clearedStock = [createStockItem({ quantity: 0, total: 0, averageCost: 0 })];
    blight.clearStock.mockResolvedValue(clearedStock);

    await useStockStore.getState().clearStock();

    expect(blight.clearStock).toHaveBeenCalledTimes(1);
    expect(useStockStore.getState().stock).toEqual(clearedStock);
  });

  it("stores stock filters", () => {
    useStockStore.getState().setCategoryFilter("TELAS" as Category);
    useStockStore.getState().setTierFilter("T7" as AppTier);

    expect(useStockStore.getState().categoryFilter).toBe("TELAS");
    expect(useStockStore.getState().tierFilter).toBe("T7");
  });

  it("stores and rethrows load errors", async () => {
    const failure = new Error("stock unavailable");
    blight.listStock.mockRejectedValue(failure);

    await expect(useStockStore.getState().loadStock()).rejects.toThrow("stock unavailable");

    expect(useStockStore.getState().error).toBe("stock unavailable");
    expect(useStockStore.getState().loading).toBe(false);
  });
});
