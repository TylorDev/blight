import { beforeEach, describe, expect, it } from "vitest";
import { usePurchaseStore } from "../../src/stores/purchase-store";
import { createPurchaseInvoice, installBlightMock } from "./mock-blight";

let blight: ReturnType<typeof installBlightMock>;

beforeEach(() => {
  blight = installBlightMock();
  usePurchaseStore.setState({ invoices: [], loading: false, error: null });
});

describe("purchase-store", () => {
  it("loads purchase invoices from window.blight", async () => {
    const invoices = [createPurchaseInvoice()];
    blight.listPurchaseInvoices.mockResolvedValue(invoices);

    await usePurchaseStore.getState().loadPurchaseInvoices();

    expect(blight.listPurchaseInvoices).toHaveBeenCalledTimes(1);
    expect(usePurchaseStore.getState().invoices).toEqual(invoices);
    expect(usePurchaseStore.getState().loading).toBe(false);
    expect(usePurchaseStore.getState().error).toBeNull();
  });

  it("stores and rethrows load errors", async () => {
    const failure = new Error("purchase invoices unavailable");
    blight.listPurchaseInvoices.mockRejectedValue(failure);

    await expect(usePurchaseStore.getState().loadPurchaseInvoices()).rejects.toThrow("purchase invoices unavailable");

    expect(usePurchaseStore.getState().error).toBe("purchase invoices unavailable");
    expect(usePurchaseStore.getState().loading).toBe(false);
  });
});
