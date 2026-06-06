import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import { Archive, ArrowLeft, CircleDollarSign, Factory, History, Loader2, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router";
import { BulkPurchaseDialog, ClearStockDialog, Metric, PurchaseDialog, TicketDialog } from "./Components";
import { formatCurrency, formatNumber } from "./app-data";
import { HistoryTab } from "./Pages/HistoryTab/HistoryTab";
import { StockTab } from "./Pages/StockTab/StockTab";
import { StaffStockTab } from "./Pages/StaffStockTab/StaffStockTab";
import { TicketTab } from "./Pages/TicketTab/TicketTab";
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
      <Routes>
        <Route
          path="/"
          element={
            <DashboardShell
              closedTicketsCount={closedTicketsCount}
              errors={errors}
              missingMaterials={missingMaterials}
              openTicketsCount={openTicketsCount}
              staffQuantity={staffQuantity}
              totals={totals}
            />
          }
        />
        <Route path="/Market" element={<MarketShell errors={errors} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Tooltip.Provider>
  );
}

function DashboardShell({
  closedTicketsCount,
  errors,
  missingMaterials,
  openTicketsCount,
  staffQuantity,
  totals
}: {
  closedTicketsCount: number;
  errors: Array<string | null>;
  missingMaterials: string[];
  openTicketsCount: number;
  staffQuantity: number;
  totals: { quantity: number; total: number };
}) {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Blight</p>
          <h1>Inventario y fabricacion</h1>
        </div>
        <div className="actions">
          <Link className="button" to="/Market">
            <Package />
            Market
          </Link>
          <PurchaseDialog />
          <BulkPurchaseDialog />
          <ClearStockDialog />
          <TicketDialog />
        </div>
      </header>

      <section className="metrics">
        <Metric icon={<Archive />} label="Stock total" value={formatNumber(totals.quantity)} />
        <Metric icon={<CircleDollarSign />} label="Valor inventario" value={formatCurrency(totals.total)} />
        <Metric icon={<Factory />} label="Tickets abiertos" value={String(openTicketsCount)} />
        <Metric icon={<History />} label="Fabricaciones" value={String(closedTicketsCount)} />
        <Metric icon={<Package />} label="Bastones en stock" value={formatNumber(staffQuantity)} />
      </section>

      <AppNotices errors={errors} missingMaterials={missingMaterials} />

      <Tabs.Root defaultValue="stock" className="workspace">
        <Tabs.List className="tab-list">
          <Tabs.Trigger value="stock">Inventario</Tabs.Trigger>
          <Tabs.Trigger value="tickets">Tickets</Tabs.Trigger>
          <Tabs.Trigger value="history">Historial</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="stock" className="panel">
          <StockTab />
        </Tabs.Content>

        <Tabs.Content value="tickets" className="panel">
          <TicketTab />
        </Tabs.Content>

        <Tabs.Content value="history" className="panel">
          <HistoryTab />
        </Tabs.Content>
      </Tabs.Root>
    </main>
  );
}

function MarketShell({ errors }: { errors: Array<string | null> }) {
  return (
    <main className="app-shell app-shell--market">
      <header className="topbar">
        <div>
          <p className="eyebrow">Blight Market</p>
          <h1>Operacion de bastones</h1>
        </div>
        <div className="actions">
          <Link className="button ghost" to="/">
            <ArrowLeft />
            Inventario
          </Link>
        </div>
      </header>

      <AppNotices errors={errors} missingMaterials={[]} />
      <StaffStockTab />
    </main>
  );
}

function AppNotices({ errors, missingMaterials }: { errors: Array<string | null>; missingMaterials: string[] }) {
  return (
    <>
      {errors.map((error) => (
        <div className="notice danger" key={error}>
          {error}
        </div>
      ))}
      {missingMaterials.length > 0 ? (
        <div className="notice danger">
          Faltan materiales: {missingMaterials.join(", ")}
        </div>
      ) : null}
    </>
  );
}

export default App;
