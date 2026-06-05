import { create } from "zustand";
import type { FabricationTicketView } from "../../electron/types";

interface HistoryStore {
  tickets: FabricationTicketView[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loadHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  tickets: [],
  loading: false,
  error: null,
  clearError: () => set({ error: null }),
  loadHistory: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await window.blight.listHistory();
      set({ tickets });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo cargar el historial.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  clearHistory: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await window.blight.clearHistory();
      set({ tickets });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo vaciar el historial.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  }
}));
