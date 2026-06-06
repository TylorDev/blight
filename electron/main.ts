import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import {
  adjustStaffStock,
  closeTicket,
  clearStock,
  clearHistory,
  createBulkPurchase,
  createPurchase,
  createTicket,
  deleteOpenTicket,
  disconnectPrisma,
  initializeDatabase,
  listHistory,
  listOpenTickets,
  listPendingLeftoverCredits,
  listStaffMovements,
  listStaffStock,
  listStaffStockLots,
  listStock,
  listTickets,
  sellStaffStock
} from "./inventory-service";
import type {
  AdjustStaffStockInput,
  AppTier,
  CloseTicketInput,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  CreateTicketInput,
  SellStaffStockInput
} from "./types";

const rendererUrl = process.env.ELECTRON_RENDERER_URL;

const consoleLevels: Record<number, "log" | "warn" | "error"> = {
  0: "log",
  1: "warn",
  2: "error",
  3: "error"
};

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#09090b",
    title: "Blight",
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.webContents.on("console-message", (_event, ...args: unknown[]) => {
    const params =
      typeof args[0] === "object" && args[0] !== null
        ? (args[0] as { level: number; message: string; lineNumber: number; sourceId?: string })
        : {
            level: args[0] as number,
            message: args[1] as string,
            lineNumber: args[2] as number,
            sourceId: args[3] as string | undefined
          };
    const method = consoleLevels[params.level] ?? "log";
    const location = params.sourceId ? `${params.sourceId}:${params.lineNumber}` : `line ${params.lineNumber}`;
    console[method](`[renderer] ${params.message} (${location})`);
  });

  window.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer] process gone: ${details.reason} (${details.exitCode})`);
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer] failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  await initializeDatabase();

  ipcMain.handle("stock:list", () => listStock());
  ipcMain.handle("stock:clear", () => clearStock());
  ipcMain.handle("purchase:create", (_event, input: CreatePurchaseInput) => createPurchase(input));
  ipcMain.handle("purchase:createBulk", (_event, input: CreateBulkPurchaseInput) => createBulkPurchase(input));
  ipcMain.handle("ticket:create", (_event, input: CreateTicketInput) => createTicket(input));
  ipcMain.handle("ticket:deleteOpen", (_event, ticketId: string) => deleteOpenTicket(ticketId));
  ipcMain.handle("ticket:list", () => listTickets());
  ipcMain.handle("ticket:listOpen", () => listOpenTickets());
  ipcMain.handle("history:list", () => listHistory());
  ipcMain.handle("history:clear", () => clearHistory());
  ipcMain.handle("leftover:listPending", (_event, tier: AppTier) => listPendingLeftoverCredits(tier));
  ipcMain.handle("ticket:close", (_event, input: CloseTicketInput) => closeTicket(input));
  ipcMain.handle("staffStock:list", () => listStaffStock());
  ipcMain.handle("staffStock:listLots", () => listStaffStockLots());
  ipcMain.handle("staffStock:listMovements", () => listStaffMovements());
  ipcMain.handle("staffStock:adjust", (_event, input: AdjustStaffStockInput) => adjustStaffStock(input));
  ipcMain.handle("staffStock:sell", (_event, input: SellStaffStockInput) => sellStaffStock(input));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void disconnectPrisma();
});
