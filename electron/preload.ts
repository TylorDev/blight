import { contextBridge, ipcRenderer } from "electron";
import type { AppApi, AppTier, CloseTicketInput, CreateBulkPurchaseInput, CreatePurchaseInput, CreateTicketInput } from "./types";

const api: AppApi = {
  listStock: () => ipcRenderer.invoke("stock:list"),
  clearStock: () => ipcRenderer.invoke("stock:clear"),
  createPurchase: (input: CreatePurchaseInput) => ipcRenderer.invoke("purchase:create", input),
  createBulkPurchase: (input: CreateBulkPurchaseInput) => ipcRenderer.invoke("purchase:createBulk", input),
  createTicket: (input: CreateTicketInput) => ipcRenderer.invoke("ticket:create", input),
  listTickets: () => ipcRenderer.invoke("ticket:list"),
  listOpenTickets: () => ipcRenderer.invoke("ticket:listOpen"),
  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  listPendingLeftoverCredits: (tier: AppTier) => ipcRenderer.invoke("leftover:listPending", tier),
  closeTicket: (input: CloseTicketInput) => ipcRenderer.invoke("ticket:close", input)
};

contextBridge.exposeInMainWorld("blight", api);
