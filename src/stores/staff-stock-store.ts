import { create } from "zustand";
import type {
  AdjustStaffStockInput,
  AppTier,
  SellStaffStockInput,
  StaffQualityView,
  StaffStockItemView,
  StaffStockLotView,
  StaffStockMovementView
} from "../../electron/types";
import type { FilterValue } from "../app-data";

interface StaffStockStore {
  stock: StaffStockItemView[];
  lots: StaffStockLotView[];
  movements: StaffStockMovementView[];
  loading: boolean;
  error: string | null;
  tierFilter: FilterValue<AppTier>;
  qualityFilter: FilterValue<StaffQualityView>;
  setTierFilter: (value: FilterValue<AppTier>) => void;
  setQualityFilter: (value: FilterValue<StaffQualityView>) => void;
  clearError: () => void;
  loadStaffStock: () => Promise<void>;
  loadStaffStockLots: () => Promise<void>;
  loadStaffMovements: () => Promise<void>;
  adjustStaffStock: (input: AdjustStaffStockInput) => Promise<void>;
  sellStaffStock: (input: SellStaffStockInput) => Promise<void>;
}

export const useStaffStockStore = create<StaffStockStore>((set, get) => ({
  stock: [],
  lots: [],
  movements: [],
  loading: false,
  error: null,
  tierFilter: "TODOS",
  qualityFilter: "TODOS",
  setTierFilter: (tierFilter) => set({ tierFilter }),
  setQualityFilter: (qualityFilter) => set({ qualityFilter }),
  clearError: () => set({ error: null }),
  loadStaffStock: async () => {
    set({ loading: true, error: null });
    try {
      const stock = await window.blight.listStaffStock();
      set({ stock });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo cargar el stock de bastones.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  loadStaffStockLots: async () => {
    set({ loading: true, error: null });
    try {
      const lots = await window.blight.listStaffStockLots();
      set({ lots });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudieron cargar los lotes de bastones.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  loadStaffMovements: async () => {
    set({ loading: true, error: null });
    try {
      const movements = await window.blight.listStaffMovements();
      set({ movements });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudieron cargar los movimientos.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  adjustStaffStock: async (input) => {
    set({ error: null });
    try {
      await window.blight.adjustStaffStock(input);
      await Promise.all([get().loadStaffStock(), get().loadStaffStockLots(), get().loadStaffMovements()]);
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo ajustar el stock.";
      set({ error });
      throw currentError;
    }
  },
  sellStaffStock: async (input) => {
    set({ error: null });
    try {
      await window.blight.sellStaffStock(input);
      await Promise.all([get().loadStaffStock(), get().loadStaffStockLots(), get().loadStaffMovements()]);
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo registrar la venta.";
      set({ error });
      throw currentError;
    }
  }
}));
