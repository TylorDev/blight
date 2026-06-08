import { describe, expect, it } from "vitest";
import { createEmptyPurchaseCalculation, updatePurchaseCalculation } from "../../src/purchase-calculator";

describe("purchase-calculator", () => {
  it("recalculates quantity while total is typed after manual average cost", () => {
    let draft = createEmptyPurchaseCalculation();
    draft = updatePurchaseCalculation(draft, "averageCost", "25000");
    draft = updatePurchaseCalculation(draft, "total", "25000");

    expect(draft).toMatchObject({
      quantity: "1",
      averageCost: "25.000",
      total: "25.000",
      origins: {
        quantity: "calculated",
        averageCost: "manual",
        total: "manual"
      }
    });

    draft = updatePurchaseCalculation(draft, "total", "250000");

    expect(draft).toMatchObject({
      quantity: "10",
      averageCost: "25.000",
      total: "250.000",
      origins: {
        quantity: "calculated",
        averageCost: "manual",
        total: "manual"
      }
    });
  });

  it("recalculates quantity while average cost is typed after manual total", () => {
    let draft = createEmptyPurchaseCalculation();
    draft = updatePurchaseCalculation(draft, "total", "250000");
    draft = updatePurchaseCalculation(draft, "averageCost", "2");

    expect(draft.quantity).toBe("125.000");
    expect(draft.total).toBe("250.000");

    draft = updatePurchaseCalculation(draft, "averageCost", "25000");

    expect(draft).toMatchObject({
      quantity: "10",
      averageCost: "25.000",
      total: "250.000",
      origins: {
        quantity: "calculated",
        averageCost: "manual",
        total: "manual"
      }
    });
  });

  it("calculates total from manual quantity and manual average cost", () => {
    let draft = createEmptyPurchaseCalculation();
    draft = updatePurchaseCalculation(draft, "quantity", "10");
    draft = updatePurchaseCalculation(draft, "averageCost", "25000");

    expect(draft).toMatchObject({
      quantity: "10",
      averageCost: "25.000",
      total: "250.000",
      origins: {
        quantity: "manual",
        averageCost: "manual",
        total: "calculated"
      }
    });
  });

  it("calculates average cost from manual quantity and manual total", () => {
    let draft = createEmptyPurchaseCalculation();
    draft = updatePurchaseCalculation(draft, "quantity", "10");
    draft = updatePurchaseCalculation(draft, "total", "250000");

    expect(draft).toMatchObject({
      quantity: "10",
      averageCost: "25.000",
      total: "250.000",
      origins: {
        quantity: "manual",
        averageCost: "calculated",
        total: "manual"
      }
    });
  });
});
