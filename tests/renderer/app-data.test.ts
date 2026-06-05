import { describe, expect, it } from "vitest";
import { calculateTicketPreview } from "../../src/app-data";
import { createLeftoverCredit, createStockItem } from "./mock-blight";

describe("app-data", () => {
  it("reduces ticket preview materials with pending leftovers", () => {
    const preview = calculateTicketPreview(
      [
        createStockItem({ category: "TABLAS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "TELAS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "ARTEFACTOS", quantity: 100, averageCost: 1000 }),
        createStockItem({ category: "DIARIOS_VACIOS", quantity: 100, averageCost: 1000 })
      ],
      "T5",
      100,
      [
        createLeftoverCredit({ category: "TABLAS", quantity: 10, value: 10000 }),
        createLeftoverCredit({ category: "TELAS", quantity: 7, value: 7000 })
      ]
    );

    expect(preview.materials.find((material) => material.category === "TABLAS")?.quantity).toBe(63);
    expect(preview.materials.find((material) => material.category === "TELAS")?.quantity).toBe(37);
  });
});
