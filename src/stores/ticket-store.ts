import { create } from "zustand";
import type {
  AppTier,
  CloseTicketInput,
  CloseTicketResult,
  CreateTicketInput,
  FabricationTicketView,
  MissingMaterial
} from "../../electron/types";
import { categoryLabels } from "../app-data";

interface TicketStore {
  tickets: FabricationTicketView[];
  loading: boolean;
  error: string | null;
  missingMaterials: string[];
  setMissingMaterials: (items: string[]) => void;
  clearError: () => void;
  loadTickets: () => Promise<void>;
  createTicket: (input: CreateTicketInput) => Promise<void>;
  closeTicket: (input: CloseTicketInput) => Promise<CloseTicketResult>;
  listPendingLeftoverCredits: (tier: AppTier) => ReturnType<typeof window.blight.listPendingLeftoverCredits>;
}

export const useTicketStore = create<TicketStore>((set, get) => ({
  tickets: [],
  loading: false,
  error: null,
  missingMaterials: [],
  setMissingMaterials: (missingMaterials) => set({ missingMaterials }),
  clearError: () => set({ error: null }),
  loadTickets: async () => {
    set({ loading: true, error: null });
    try {
      const tickets = await window.blight.listOpenTickets();
      set({ tickets });
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudieron cargar los tickets.";
      set({ error });
      throw currentError;
    } finally {
      set({ loading: false });
    }
  },
  createTicket: async (input) => {
    set({ error: null, missingMaterials: [] });
    try {
      await window.blight.createTicket(input);
      await get().loadTickets();
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo crear el ticket.";
      set({ error });
      throw currentError;
    }
  },
  closeTicket: async (input) => {
    set({ error: null, missingMaterials: [] });
    try {
      const result = await window.blight.closeTicket(input);
      if (!result.ok) {
        set({ missingMaterials: formatMissingMaterials(result.missing ?? []) });
        return result;
      }

      await get().loadTickets();
      return result;
    } catch (currentError) {
      const error = currentError instanceof Error ? currentError.message : "No se pudo cerrar el ticket.";
      set({ error });
      throw currentError;
    }
  },
  listPendingLeftoverCredits: (tier) => window.blight.listPendingLeftoverCredits(tier)
}));

function formatMissingMaterials(items: MissingMaterial[]) {
  return items.map((item) => `${categoryLabels[item.category]} ${item.tier} (${item.available}/${item.required})`);
}
