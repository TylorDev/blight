import { beforeEach, describe, expect, it, vi } from "vitest";

const expectedChannels = [
  "stock:list",
  "stock:clear",
  "purchase:create",
  "purchase:createBulk",
  "purchase:listInvoices",
  "ticket:create",
  "ticket:deleteOpen",
  "ticket:list",
  "ticket:listOpen",
  "history:list",
  "history:clear",
  "leftover:listPending",
  "ticket:close",
  "staffStock:list",
  "staffStock:listLots",
  "staffStock:listMovements",
  "staffStock:adjust",
  "staffStock:sell"
];

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.ELECTRON_RENDERER_URL;
});

describe("main process", () => {
  it("registers all expected IPC channels", async () => {
    const { ipcMain } = installMainMocks();

    await importMain();

    expect(ipcMain.handle.mock.calls.map(([channel]) => channel)).toEqual(expectedChannels);
  });

  it("creates a secure browser window and loads the renderer file by default", async () => {
    const { BrowserWindow, windows } = installMainMocks();

    await importMain();

    expect(BrowserWindow).toHaveBeenCalledTimes(1);
    expect(windows[0].options).toMatchObject({
      width: 1280,
      height: 820,
      minWidth: 980,
      minHeight: 680,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    expect(windows[0].options.webPreferences.preload).toContain("preload");
    expect(windows[0].options.webPreferences.preload).toContain("preload.js");
    expect(windows[0].loadFile).toHaveBeenCalledWith(expect.stringContaining("renderer"));
    expect(windows[0].loadURL).not.toHaveBeenCalled();
  });

  it("loads the renderer URL when ELECTRON_RENDERER_URL is present", async () => {
    const { windows } = installMainMocks("http://localhost:5173");

    await importMain();

    expect(windows[0].loadURL).toHaveBeenCalledWith("http://localhost:5173");
    expect(windows[0].loadFile).not.toHaveBeenCalled();
  });
});

function installMainMocks(rendererUrl?: string) {
  if (rendererUrl) {
    process.env.ELECTRON_RENDERER_URL = rendererUrl;
  }

  const ipcMain = {
    handle: vi.fn()
  };
  const app = {
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn()
  };
  const windows: Array<{
    options: {
      width: number;
      height: number;
      minWidth: number;
      minHeight: number;
      webPreferences: {
        preload: string;
        contextIsolation: boolean;
        nodeIntegration: boolean;
      };
    };
    webContents: { on: ReturnType<typeof vi.fn> };
    loadURL: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
  }> = [];
  const BrowserWindow = vi.fn(function BrowserWindow(options) {
    const window = {
      options,
      webContents: { on: vi.fn() },
      loadURL: vi.fn(() => Promise.resolve()),
      loadFile: vi.fn(() => Promise.resolve())
    };
    windows.push(window);
    return window;
  });
  Object.assign(BrowserWindow, {
    getAllWindows: vi.fn(() => windows)
  });

  vi.doMock("electron", () => ({ app, BrowserWindow, ipcMain }));
  vi.doMock("../electron/inventory-service", () => ({
    adjustStaffStock: vi.fn(),
    closeTicket: vi.fn(),
    clearHistory: vi.fn(),
    clearStock: vi.fn(),
    createBulkPurchase: vi.fn(),
    createPurchase: vi.fn(),
    listPurchaseInvoices: vi.fn(),
    createTicket: vi.fn(),
    deleteOpenTicket: vi.fn(),
    disconnectPrisma: vi.fn(),
    initializeDatabase: vi.fn(() => Promise.resolve()),
    listHistory: vi.fn(),
    listOpenTickets: vi.fn(),
    listPendingLeftoverCredits: vi.fn(),
    listStaffMovements: vi.fn(),
    listStaffStock: vi.fn(),
    listStaffStockLots: vi.fn(),
    listStock: vi.fn(),
    listTickets: vi.fn(),
    sellStaffStock: vi.fn()
  }));

  return { app, BrowserWindow, ipcMain, windows };
}

async function importMain() {
  await import("../electron/main");
  await new Promise((resolve) => setTimeout(resolve, 0));
}
