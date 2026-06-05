import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import {
  closeTicket,
  clearStock,
  createBulkPurchase,
  createPurchase,
  createTicket,
  disconnectPrisma,
  initializeDatabase,
  listHistory,
  listOpenTickets,
  listPendingLeftoverCredits,
  listStock,
  listTickets
} from "./inventory-service";
import type { AppTier, CloseTicketInput, CreateBulkPurchaseInput, CreatePurchaseInput, CreateTicketInput } from "./types";

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

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

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
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
  ipcMain.handle("ticket:list", () => listTickets());
  ipcMain.handle("ticket:listOpen", () => listOpenTickets());
  ipcMain.handle("history:list", () => listHistory());
  ipcMain.handle("leftover:listPending", (_event, tier: AppTier) => listPendingLeftoverCredits(tier));
  ipcMain.handle("ticket:close", (_event, input: CloseTicketInput) => closeTicket(input));

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
