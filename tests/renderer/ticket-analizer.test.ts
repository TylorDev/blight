import { describe, expect, it } from "vitest";
import type { AppTier, StaffQualityView } from "../../electron/types";
import {
  analyzeTickets,
  createDefaultTicketAnalizerHistoryManualState,
  createDefaultSaleValueByPower,
  createDefaultSaleValueExceptions,
  createEmptyTicketAnalizerHistorySummary,
  createTicketQualityOverrideKey,
  defaultTicketAnalizerTaxPercentages,
  getTicketAnalizerValuesFromManualState,
  normalizeTicketAnalizerPercentInput,
  parseTicketAnalizerPercentInput,
  selectLatestXlTickets
} from "../../src/Pages/TicketAnalizer/ticket-analizer";
import { createTicket } from "./mock-blight";

describe("ticket-analizer", () => {
  it("selects the 4 most recent closed XL tickets", () => {
    const tickets = [
      xlTicket("XL-0001", "T5", "2026-01-01T00:00:00.000Z"),
      xlTicket("XL-0002", "T6", "2026-01-02T00:00:00.000Z"),
      xlTicket("XL-0003", "T7", "2026-01-03T00:00:00.000Z"),
      xlTicket("XL-0004", "T8", "2026-01-04T00:00:00.000Z"),
      xlTicket("XL-0005", "T8", "2026-01-05T00:00:00.000Z"),
      createTicket({ id: "ticket-normal", status: "CERRADO", closedAt: "2026-01-06T00:00:00.000Z" }),
      createTicket({ id: "XL-0006", status: "ABIERTO", closedAt: null })
    ];

    expect(selectLatestXlTickets(tickets).map((ticket) => ticket.id)).toEqual([
      "XL-0005",
      "XL-0004",
      "XL-0003",
      "XL-0002"
    ]);
  });

  it("validates that selected tickets cover the 4 tiers", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5"),
        xlTicket("XL-0002", "T5"),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      ["XL-0001", "XL-0002", "XL-0003", "XL-0004"],
      createDefaultSaleValueByPower()
    );

    expect(analysis.errors).toContain("Faltan tiers: T6.");
  });

  it("groups produced staffs by item power with fallback sale values", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [
          produced("NORMAL", 2),
          produced("BUENA", 1)
        ]),
        xlTicket("XL-0002", "T6", undefined, [produced("NORMAL", 3)]),
        xlTicket("XL-0003", "T7", undefined, [produced("NOTABLE", 1)]),
        xlTicket("XL-0004", "T8", undefined, [produced("OBRA_MAESTRA", 1)])
      ],
      [],
      createDefaultSaleValueByPower()
    );

    const power1580 = analysis.powerGroups.find((group) => group.itemPower === 1580);

    expect(analysis.errors).toEqual([]);
    expect(power1580).toMatchObject({
      combinations: ["T5-Buena", "T6-Normal"],
      quantity: 4,
      saleValue: 535000,
      sale: 2140000,
      cost: 4000,
      profit: 2136000,
      unitCosts: [
        { tier: "T5", unitCost: 1000 },
        { tier: "T6", unitCost: 1000 }
      ]
    });
    expect(analysis.totalSale).toBe(5080000);
    expect(analysis.totalProfit).toBe(5072000);
    expect(analysis.financialSummary).toMatchObject({
      grossSale: 5080000,
      netProfit: 4792600,
      profitBeforeTaxes: 5072000,
      taxesAndFees: 279400,
      totalCost: 8000,
      totalQuantity: 8
    });
    expect(analysis.summaryByTicket.find((item) => item.tier === "T5")).toMatchObject({
      quantity: 3,
      sale: 1535000,
      profit: 1532000,
      ticketId: "XL-0001"
    });
  });

  it("uses custom sale values by item power", () => {
    const values = createDefaultSaleValueByPower();
    values[1560] = 250000;
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [produced("NORMAL", 2)]),
        xlTicket("XL-0002", "T6"),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      [],
      values
    );

    const power1560 = analysis.powerGroups.find((group) => group.itemPower === 1560);

    expect(power1560).toMatchObject({
      quantity: 2,
      saleValue: 250000,
      sale: 500000,
      cost: 2000,
      profit: 498000
    });
  });

  it("uses manual unit cost overrides for the matching ticket only", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [produced("NORMAL", 2)]),
        xlTicket("XL-0002", "T6", undefined, [produced("NORMAL", 1)]),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      [],
      createDefaultSaleValueByPower(),
      createDefaultSaleValueExceptions(),
      { unitCostByTicketId: { "XL-0001": 450000 } }
    );

    expect(analysis.summaryByTicket.find((item) => item.tier === "T5")).toMatchObject({
      unitCost: 450000,
      quantity: 2,
      sale: 1000000,
      profit: 100000
    });
    expect(analysis.financialSummary).toMatchObject({
      grossSale: 2885000,
      netProfit: 1823325,
      profitBeforeTaxes: 1982000,
      taxesAndFees: 158675,
      totalCost: 903000,
      totalQuantity: 5
    });
    expect(analysis.profitByTier.find((item) => item.tier === "T5")).toMatchObject({
      cost: 900000,
      quantity: 2,
      sale: 1000000,
      profit: 100000,
      unitCosts: [{ tier: "T5", unitCost: 450000 }]
    });
    expect(analysis.profitByQuality.find((item) => item.quality === "NORMAL")).toMatchObject({
      cost: 903000,
      quantity: 5,
      sale: 2885000,
      profit: 1982000,
      unitCosts: [
        { tier: "T5", unitCost: 450000 },
        { tier: "T6", unitCost: 1000 },
        { tier: "T7", unitCost: 1000 },
        { tier: "T8", unitCost: 1000 }
      ]
    });
    expect(analysis.summaryByTicket.find((item) => item.tier === "T6")).toMatchObject({
      unitCost: 1000,
      quantity: 1,
      sale: 535000,
      profit: 534000
    });
  });

  it("uses manual quantity overrides by ticket and quality with original fallbacks", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [produced("NORMAL", 5)]),
        xlTicket("XL-0002", "T6", undefined, [produced("NORMAL", 1)]),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      [],
      createDefaultSaleValueByPower(),
      createDefaultSaleValueExceptions(),
      {
        quantityByTicketAndQuality: {
          [createTicketQualityOverrideKey("XL-0001", "NORMAL")]: 0,
          [createTicketQualityOverrideKey("XL-0001", "SOBRESALIENTE")]: 2
        }
      }
    );

    const t5Detail = analysis.detailByTier.find((item) => item.tier === "T5");

    expect(t5Detail?.qualities.find((item) => item.quality === "NORMAL")).toMatchObject({ quantity: 0 });
    expect(t5Detail?.qualities.find((item) => item.quality === "SOBRESALIENTE")).toMatchObject({
      quantity: 2,
      sale: 1140000,
      cost: 2000,
      profit: 1138000
    });
    expect(analysis.powerGroups.find((group) => group.itemPower === 1620)).toMatchObject({
      cost: 3000,
      quantity: 3,
      sale: 1940000,
      profit: 1937000,
      unitCosts: [
        { tier: "T5", unitCost: 1000 },
        { tier: "T8", unitCost: 1000 }
      ]
    });
    expect(analysis.summaryByTicket.find((item) => item.tier === "T6")).toMatchObject({
      quantity: 1,
      unitCost: 1000
    });
  });

  it("uses sale value exceptions before the base item power value", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5"),
        xlTicket("XL-0002", "T6", undefined, [produced("OBRA_MAESTRA", 1)]),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8", undefined, [
          produced("NORMAL", 1),
          produced("BUENA", 1),
          produced("NOTABLE", 1)
        ])
      ],
      [],
      createDefaultSaleValueByPower(),
      createDefaultSaleValueExceptions()
    );

    expect(analysis.staffRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tier: "T6", quality: "OBRA_MAESTRA", itemPower: 1680, saleValue: 800000 }),
        expect.objectContaining({ tier: "T8", quality: "NORMAL", itemPower: 1620, saleValue: 800000 }),
        expect.objectContaining({ tier: "T8", quality: "BUENA", itemPower: 1640, saleValue: 850000 }),
        expect.objectContaining({ tier: "T8", quality: "NOTABLE", itemPower: 1660, saleValue: 870000 })
      ])
    );
    expect(analysis.powerGroups.find((group) => group.itemPower === 1680)).toMatchObject({
      saleValue: 900000,
      sale: 800000
    });
    expect(analysis.summaryByTicket.find((item) => item.tier === "T8")).toMatchObject({
      sale: 2520000,
      profit: 2517000
    });
  });

  it("uses custom sale tax percentages in the financial summary", () => {
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [produced("NORMAL", 2)]),
        xlTicket("XL-0002", "T6"),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      [],
      createDefaultSaleValueByPower(),
      createDefaultSaleValueExceptions(),
      {},
      { saleOrderTaxPercent: 2, saleTaxPercent: 3 }
    );

    expect(analysis.financialSummary).toMatchObject({
      grossSale: 2885000,
      netProfit: 2735750,
      profitBeforeTaxes: 2880000,
      taxesAndFees: 144250,
      totalCost: 5000,
      totalQuantity: 5
    });
  });

  it("normalizes and parses ticket analizer percent inputs", () => {
    expect(normalizeTicketAnalizerPercentInput("abc1,5%")).toBe("1.5");
    expect(normalizeTicketAnalizerPercentInput("4.5.6")).toBe("4.56");
    expect(parseTicketAnalizerPercentInput("", 1.5)).toBe(1.5);
    expect(parseTicketAnalizerPercentInput("4.25", 1.5)).toBe(4.25);
    expect(parseTicketAnalizerPercentInput("-1", 1.5)).toBe(1.5);
  });

  it("creates default HistoryXL snapshot state for newly opened XL tickets", () => {
    expect(createDefaultTicketAnalizerHistoryManualState()).toMatchObject({
      effectiveSaleValueByPower: createDefaultSaleValueByPower(),
      effectiveSaleValueExceptions: createDefaultSaleValueExceptions(),
      effectiveTaxPercentages: defaultTicketAnalizerTaxPercentages,
      exceptionInputs: {
        "T6:OBRA_MAESTRA": "",
        "T8:NORMAL": "",
        "T8:BUENA": "",
        "T8:NOTABLE": ""
      },
      quantityDrafts: {},
      saleInputsByPower: {
        1560: "",
        1580: "",
        1600: "",
        1620: "",
        1640: "",
        1660: "",
        1680: "",
        1700: "",
        1720: ""
      },
      saleOrderTaxInput: "",
      saleTaxInput: "",
      unitCostDrafts: {}
    });
    expect(createEmptyTicketAnalizerHistorySummary()).toEqual({
      grossSale: 0,
      netProfit: 0,
      profitBeforeTaxes: 0,
      taxesAndFees: 0,
      totalCost: 0,
      totalQuantity: 0
    });
  });

  it("converts saved HistoryXL manual state into analyzable values", () => {
    const manualState = createDefaultTicketAnalizerHistoryManualState();
    manualState.saleInputsByPower[1560] = "600.000";
    manualState.exceptionInputs["T8:NORMAL"] = "900.000";
    manualState.saleOrderTaxInput = "2";
    manualState.saleTaxInput = "3";
    manualState.unitCostDrafts = { "XL-0001": "450.000" };
    manualState.quantityDrafts = { [createTicketQualityOverrideKey("XL-0001", "NORMAL")]: "2" };

    expect(getTicketAnalizerValuesFromManualState(manualState)).toMatchObject({
      editOverrides: {
        quantityByTicketAndQuality: { "XL-0001:NORMAL": 2 },
        unitCostByTicketId: { "XL-0001": 450000 }
      },
      saleValueByPower: { 1560: 600000 },
      saleValueExceptions: { "T8:NORMAL": 900000 },
      taxPercentages: { saleOrderTaxPercent: 2, saleTaxPercent: 3 }
    });
  });

  it("recalculates a zero HistoryXL snapshot summary from closed tickets", () => {
    const manualState = createDefaultTicketAnalizerHistoryManualState();
    const values = getTicketAnalizerValuesFromManualState(manualState);
    const analysis = analyzeTickets(
      [
        xlTicket("XL-0001", "T5", undefined, [produced("NORMAL", 2)]),
        xlTicket("XL-0002", "T6"),
        xlTicket("XL-0003", "T7"),
        xlTicket("XL-0004", "T8")
      ],
      ["XL-0001", "XL-0002", "XL-0003", "XL-0004"],
      values.saleValueByPower,
      values.saleValueExceptions,
      values.editOverrides,
      values.taxPercentages
    );

    expect(createEmptyTicketAnalizerHistorySummary()).toMatchObject({ netProfit: 0, totalQuantity: 0 });
    expect(analysis.errors).toEqual([]);
    expect(analysis.financialSummary.netProfit).toBeGreaterThan(0);
    expect(analysis.financialSummary.totalQuantity).toBe(5);
  });
});

function xlTicket(
  id: string,
  tier: AppTier,
  closedAt = "2026-01-01T00:00:00.000Z",
  producedStaffs = [produced("NORMAL", 1)]
) {
  return createTicket({
    id,
    tier,
    status: "CERRADO",
    unitCost: 1000,
    closedAt,
    producedStaffs: producedStaffs.map((staff, index) => ({
      id: `${id}-staff-${index}`,
      ticketId: id,
      tier,
      quality: staff.quality,
      quantity: staff.quantity,
      createdAt: "2026-01-01T00:00:00.000Z"
    }))
  });
}

function produced(quality: StaffQualityView, quantity: number) {
  return { quality, quantity };
}
