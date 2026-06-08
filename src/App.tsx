import * as Tooltip from "@radix-ui/react-tooltip";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "./AppShell/AppLayout";
import { useHistoryStore } from "./stores/history-store";
import { useStaffStockStore } from "./stores/staff-stock-store";
import { useStockStore } from "./stores/stock-store";
import { useTicketStore } from "./stores/ticket-store";

function App() {
  const stock = useStockStore((state) => state.stock);
  const stockError = useStockStore((state) => state.error);
  const loadStock = useStockStore((state) => state.loadStock);
  const openTicketsCount = useTicketStore((state) => state.tickets.length);
  const ticketError = useTicketStore((state) => state.error);
  const missingMaterials = useTicketStore((state) => state.missingMaterials);
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const closedTicketsCount = useHistoryStore((state) => state.tickets.length);
  const historyError = useHistoryStore((state) => state.error);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const staffStock = useStaffStockStore((state) => state.stock);
  const staffStockError = useStaffStockStore((state) => state.error);
  const loadStaffStock = useStaffStockStore((state) => state.loadStaffStock);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadStaffMovements = useStaffStockStore((state) => state.loadStaffMovements);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    void Promise.all([loadStock(), loadTickets(), loadHistory(), loadStaffStock(), loadStaffStockLots(), loadStaffMovements()])
      .catch(() => undefined)
      .finally(() => setInitialLoading(false));
  }, [loadHistory, loadStaffMovements, loadStaffStock, loadStaffStockLots, loadStock, loadTickets]);

  const totals = useMemo(() => {
    return stock.reduce(
      (summary, item) => ({
        quantity: summary.quantity + item.quantity,
        total: summary.total + item.total
      }),
      { quantity: 0, total: 0 }
    );
  }, [stock]);

  const staffQuantity = staffStock.reduce((total, item) => total + item.quantity, 0);
  const errors = [stockError, ticketError, historyError, staffStockError].filter(Boolean);

  if (initialLoading) {
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <span>Cargando inventario</span>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <AppLayout
        closedTicketsCount={closedTicketsCount}
        errors={errors}
        missingMaterials={missingMaterials}
        openTicketsCount={openTicketsCount}
        staffQuantity={staffQuantity}
        totals={totals}
      />
    </Tooltip.Provider>
  );
}

export default App;
