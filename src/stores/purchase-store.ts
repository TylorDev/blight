import { create } from "zustand";
import type { PurchaseInvoiceView } from "../../electron/types";

interface PurchaseStore {
  invoices: PurchaseInvoiceView[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loadPurchaseInvoices: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseStore>((set) => ({
  invoices: [],
  loading: false,
  error: null,
  clearError: () => set({ error: null }),
  loadPurchaseInvoices: async () => {
    set({ loading: true, error: null });
    try {
      const invoices = await window.blight.listPurchaseInvoices();
      set({ invoices });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo cargar el historial de compras.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  }
}));
