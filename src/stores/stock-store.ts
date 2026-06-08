import { create } from "zustand";
import type {
  AppTier,
  Category,
  CreateBulkPurchaseInput,
  CreatePurchaseInput,
  StockItemView
} from "../../electron/types";
import type { FilterValue } from "../app-data";
import { usePurchaseStore } from "./purchase-store";

interface StockStore {
  stock: StockItemView[];
  loading: boolean;
  error: string | null;
  categoryFilter: FilterValue<Category>;
  tierFilter: FilterValue<AppTier>;
  setCategoryFilter: (value: FilterValue<Category>) => void;
  setTierFilter: (value: FilterValue<AppTier>) => void;
  clearError: () => void;
  loadStock: () => Promise<void>;
  clearStock: () => Promise<void>;
  createPurchase: (input: CreatePurchaseInput) => Promise<void>;
  createBulkPurchase: (input: CreateBulkPurchaseInput) => Promise<void>;
}

export const useStockStore = create<StockStore>((set, get) => ({
  stock: [],
  loading: false,
  error: null,
  categoryFilter: "TODOS",
  tierFilter: "TODOS",
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  setTierFilter: (tierFilter) => set({ tierFilter }),
  clearError: () => set({ error: null }),
  loadStock: async () => {
    set({ loading: true, error: null });
    try {
      const stock = await window.blight.listStock();
      set({ stock });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo cargar el stock.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  clearStock: async () => {
    set({ error: null });
    try {
      const stock = await window.blight.clearStock();
      set({ stock });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo vaciar el stock.";
      set({ error });
      throw currentError;
    }
  },
  createPurchase: async (input) => {
    set({ error: null });
    try {
      await window.blight.createPurchase(input);
      await get().loadStock();
      await usePurchaseStore.getState().loadPurchaseInvoices();
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo guardar.";
      set({ error });
      throw currentError;
    }
  },
  createBulkPurchase: async (input) => {
    set({ error: null });
    try {
      await window.blight.createBulkPurchase(input);
      await get().loadStock();
      await usePurchaseStore.getState().loadPurchaseInvoices();
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo guardar.";
      set({ error });
      throw currentError;
    }
  }
}));
