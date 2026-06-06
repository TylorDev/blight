import { beforeEach, describe, expect, it } from "vitest";
import type { AppTier, StaffQualityView } from "../../electron/types";
import { useStaffStockStore } from "../../src/stores/staff-stock-store";
import { createStaffStockItem, createStaffStockLot, createStaffStockMovement, installBlightMock } from "./mock-blight";

let blight: ReturnType<typeof installBlightMock>;

beforeEach(() => {
  blight = installBlightMock();
  useStaffStockStore.setState({
    stock: [],
    lots: [],
    movements: [],
    loading: false,
    error: null,
    tierFilter: "TODOS",
    qualityFilter: "TODOS"
  });
});

describe("staff-stock-store", () => {
  it("loads staff stock from window.blight", async () => {
    const stock = [createStaffStockItem()];
    blight.listStaffStock.mockResolvedValue(stock);

    await useStaffStockStore.getState().loadStaffStock();

    expect(blight.listStaffStock).toHaveBeenCalledTimes(1);
    expect(useStaffStockStore.getState().stock).toEqual(stock);
    expect(useStaffStockStore.getState().loading).toBe(false);
  });

  it("loads staff movements from window.blight", async () => {
    const movements = [createStaffStockMovement()];
    blight.listStaffMovements.mockResolvedValue(movements);

    await useStaffStockStore.getState().loadStaffMovements();

    expect(blight.listStaffMovements).toHaveBeenCalledTimes(1);
    expect(useStaffStockStore.getState().movements).toEqual(movements);
  });

  it("loads staff stock lots from window.blight", async () => {
    const lots = [createStaffStockLot()];
    blight.listStaffStockLots.mockResolvedValue(lots);

    await useStaffStockStore.getState().loadStaffStockLots();

    expect(blight.listStaffStockLots).toHaveBeenCalledTimes(1);
    expect(useStaffStockStore.getState().lots).toEqual(lots);
    expect(useStaffStockStore.getState().loading).toBe(false);
  });

  it("stores and rethrows staff stock lot load errors and clears loading", async () => {
    const failure = new Error("staff lots unavailable");
    blight.listStaffStockLots.mockRejectedValue(failure);

    await expect(useStaffStockStore.getState().loadStaffStockLots()).rejects.toThrow("staff lots unavailable");

    expect(useStaffStockStore.getState().error).toBe("staff lots unavailable");
    expect(useStaffStockStore.getState().loading).toBe(false);
  });

  it("stores and rethrows staff movement load errors and clears loading", async () => {
    const failure = new Error("staff movements unavailable");
    blight.listStaffMovements.mockRejectedValue(failure);

    await expect(useStaffStockStore.getState().loadStaffMovements()).rejects.toThrow("staff movements unavailable");

    expect(useStaffStockStore.getState().error).toBe("staff movements unavailable");
    expect(useStaffStockStore.getState().loading).toBe(false);
  });

  it("sells staff stock and refreshes stock and movements", async () => {
    const stock = [createStaffStockItem({ quantity: 1 })];
    const lots = [createStaffStockLot({ quantity: 1 })];
    const movements = [createStaffStockMovement({ type: "VENTA" })];
    blight.sellStaffStock.mockResolvedValue(createStaffStockItem());
    blight.listStaffStock.mockResolvedValue(stock);
    blight.listStaffStockLots.mockResolvedValue(lots);
    blight.listStaffMovements.mockResolvedValue(movements);

    await useStaffStockStore.getState().sellStaffStock({
      tier: "T5" as AppTier,
      quality: "NORMAL" as StaffQualityView,
      quantity: 2,
      total: 5000
    });

    expect(blight.sellStaffStock).toHaveBeenCalledWith({ tier: "T5", quality: "NORMAL", quantity: 2, total: 5000 });
    expect(useStaffStockStore.getState().stock).toEqual(stock);
    expect(useStaffStockStore.getState().lots).toEqual(lots);
    expect(useStaffStockStore.getState().movements).toEqual(movements);
  });

  it("stores and rethrows sell staff stock errors without refreshing stock or movements", async () => {
    const failure = new Error("sell failed");
    blight.sellStaffStock.mockRejectedValue(failure);

    await expect(
      useStaffStockStore.getState().sellStaffStock({
        tier: "T5" as AppTier,
        quality: "NORMAL" as StaffQualityView,
        quantity: 2,
        total: 5000
      })
    ).rejects.toThrow("sell failed");

    expect(useStaffStockStore.getState().error).toBe("sell failed");
    expect(blight.listStaffStock).not.toHaveBeenCalled();
    expect(blight.listStaffStockLots).not.toHaveBeenCalled();
    expect(blight.listStaffMovements).not.toHaveBeenCalled();
  });

  it("adjusts staff stock and refreshes stock and movements", async () => {
    const stock = [createStaffStockItem({ quantity: 5 })];
    const lots = [createStaffStockLot({ quantity: 5 })];
    const movements = [createStaffStockMovement({ type: "AJUSTE" })];
    blight.adjustStaffStock.mockResolvedValue(createStaffStockItem());
    blight.listStaffStock.mockResolvedValue(stock);
    blight.listStaffStockLots.mockResolvedValue(lots);
    blight.listStaffMovements.mockResolvedValue(movements);

    await useStaffStockStore.getState().adjustStaffStock({
      tier: "T6" as AppTier,
      quality: "NOTABLE" as StaffQualityView,
      quantity: -1,
      reason: "Correccion"
    });

    expect(blight.adjustStaffStock).toHaveBeenCalledWith({
      tier: "T6",
      quality: "NOTABLE",
      quantity: -1,
      reason: "Correccion"
    });
    expect(useStaffStockStore.getState().stock).toEqual(stock);
    expect(useStaffStockStore.getState().lots).toEqual(lots);
    expect(useStaffStockStore.getState().movements).toEqual(movements);
  });

  it("stores and rethrows adjust staff stock errors without refreshing stock or movements", async () => {
    const failure = new Error("adjust failed");
    blight.adjustStaffStock.mockRejectedValue(failure);

    await expect(
      useStaffStockStore.getState().adjustStaffStock({
        tier: "T6" as AppTier,
        quality: "NOTABLE" as StaffQualityView,
        quantity: -1,
        reason: "Correccion"
      })
    ).rejects.toThrow("adjust failed");

    expect(useStaffStockStore.getState().error).toBe("adjust failed");
    expect(blight.listStaffStock).not.toHaveBeenCalled();
    expect(blight.listStaffStockLots).not.toHaveBeenCalled();
    expect(blight.listStaffMovements).not.toHaveBeenCalled();
  });

  it("stores and rethrows load errors", async () => {
    const failure = new Error("staff stock unavailable");
    blight.listStaffStock.mockRejectedValue(failure);

    await expect(useStaffStockStore.getState().loadStaffStock()).rejects.toThrow("staff stock unavailable");

    expect(useStaffStockStore.getState().error).toBe("staff stock unavailable");
  });
});
