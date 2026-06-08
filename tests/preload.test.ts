import { beforeEach, describe, expect, it, vi } from "vitest";

const expectedApiKeys = [
  "listStock",
  "clearStock",
  "createPurchase",
  "createBulkPurchase",
  "listPurchaseInvoices",
  "createTicket",
  "deleteOpenTicket",
  "listTickets",
  "listOpenTickets",
  "listHistory",
  "clearHistory",
  "listPendingLeftoverCredits",
  "closeTicket",
  "listStaffStock",
  "listStaffStockLots",
  "listStaffMovements",
  "adjustStaffStock",
  "sellStaffStock"
];

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("preload", () => {
  it("exposes exactly the window.blight API contract", async () => {
    const { exposeInMainWorld } = installPreloadMocks();

    await import("../electron/preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorld.mock.calls[0][0]).toBe("blight");
    expect(Object.keys(exposeInMainWorld.mock.calls[0][1]).sort()).toEqual([...expectedApiKeys].sort());
  });

  it("invokes the expected IPC channel for every API method", async () => {
    const { exposeInMainWorld, invoke } = installPreloadMocks();

    await import("../electron/preload");
    const api = exposeInMainWorld.mock.calls[0][1];

    await api.listStock();
    await api.clearStock();
    await api.createPurchase({ category: "TABLAS", tier: "T5", quantity: 1, total: 100 });
    await api.createBulkPurchase({ tier: "T5", purchases: [{ category: "TABLAS", quantity: 1, total: 100 }] });
    await api.listPurchaseInvoices();
    await api.createTicket({ tier: "T5", tax: 100 });
    await api.deleteOpenTicket("ticket-1");
    await api.listTickets();
    await api.listOpenTickets();
    await api.listHistory();
    await api.clearHistory();
    await api.listPendingLeftoverCredits("T5");
    await api.closeTicket({
      ticketId: "ticket-1",
      filledDiariesQuantity: 0,
      filledDiariesDiscount: 0,
      leftoverTablesQuantity: 1,
      leftoverClothsQuantity: 1,
      producedStaffs: [{ quality: "NORMAL", quantity: 6 }]
    });
    await api.listStaffStock();
    await api.listStaffStockLots();
    await api.listStaffMovements();
    await api.adjustStaffStock({ tier: "T5", quality: "NORMAL", quantity: 1, reason: "Conteo" });
    await api.sellStaffStock({ tier: "T5", quality: "NORMAL", quantity: 1, total: 0 });

    expect(invoke.mock.calls).toEqual([
      ["stock:list"],
      ["stock:clear"],
      ["purchase:create", { category: "TABLAS", tier: "T5", quantity: 1, total: 100 }],
      ["purchase:createBulk", { tier: "T5", purchases: [{ category: "TABLAS", quantity: 1, total: 100 }] }],
      ["purchase:listInvoices"],
      ["ticket:create", { tier: "T5", tax: 100 }],
      ["ticket:deleteOpen", "ticket-1"],
      ["ticket:list"],
      ["ticket:listOpen"],
      ["history:list"],
      ["history:clear"],
      ["leftover:listPending", "T5"],
      [
        "ticket:close",
        {
          ticketId: "ticket-1",
          filledDiariesQuantity: 0,
          filledDiariesDiscount: 0,
          leftoverTablesQuantity: 1,
          leftoverClothsQuantity: 1,
          producedStaffs: [{ quality: "NORMAL", quantity: 6 }]
        }
      ],
      ["staffStock:list"],
      ["staffStock:listLots"],
      ["staffStock:listMovements"],
      ["staffStock:adjust", { tier: "T5", quality: "NORMAL", quantity: 1, reason: "Conteo" }],
      ["staffStock:sell", { tier: "T5", quality: "NORMAL", quantity: 1, total: 0 }]
    ]);
  });
});

function installPreloadMocks() {
  const exposeInMainWorld = vi.fn();
  const invoke = vi.fn(() => Promise.resolve(undefined));

  vi.doMock("electron", () => ({
    contextBridge: { exposeInMainWorld },
    ipcRenderer: { invoke }
  }));

  return { exposeInMainWorld, invoke };
}
