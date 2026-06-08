import { Archive, CircleDollarSign, Factory, History, Package } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";
import { BulkPurchaseDialog, ClearStockDialog, Metric, PurchaseDialog, TicketDialog } from "../Components";
import { formatCurrency, formatNumber } from "../app-data";
import { BuyPage } from "../Pages/BuyPage/BuyPage";
import { HistoryTab } from "../Pages/HistoryTab/HistoryTab";
import { StaffStockTab } from "../Pages/StaffStockTab/StaffStockTab";
import { StockTab } from "../Pages/StockTab/StockTab";
import { TicketTab } from "../Pages/TicketTab/TicketTab";
import { AppNotices } from "./AppNotices";
import { AppSidebar } from "./AppSidebar";
import "./AppLayout.scss";
import { PageShell } from "./PageShell";

interface AppLayoutProps {
  closedTicketsCount: number;
  errors: Array<string | null>;
  missingMaterials: string[];
  openTicketsCount: number;
  staffQuantity: number;
  totals: { quantity: number; total: number };
}

export function AppLayout({
  closedTicketsCount,
  errors,
  missingMaterials,
  openTicketsCount,
  staffQuantity,
  totals
}: AppLayoutProps) {
  return (
    <div className="app-frame">
      <AppSidebar />

      <main className="app-shell">
        <AppNotices errors={errors} missingMaterials={missingMaterials} />

        <Routes>
          <Route path="/" element={<Navigate to="/Stock" replace />} />
          <Route
            path="/Stock"
            element={
              <PageShell eyebrow="Inventario" title="Stock de materiales" actions={<ClearStockDialog />}>
                <section className="metrics">
                  <Metric icon={<Archive />} label="Stock total" value={formatNumber(totals.quantity)} />
                  <Metric icon={<CircleDollarSign />} label="Valor inventario" value={formatCurrency(totals.total)} />
                </section>
                <section className="panel">
                  <StockTab />
                </section>
              </PageShell>
            }
          />
          <Route
            path="/Ticket"
            element={
              <PageShell eyebrow="Fabricacion" title="Tickets" actions={<TicketDialog />}>
                <section className="metrics">
                  <Metric icon={<Factory />} label="Tickets abiertos" value={String(openTicketsCount)} />
                </section>
                <div className="workspace">
                  <section className="panel">
                    <TicketTab />
                  </section>
                  <section className="panel">
                    <HistoryTab />
                  </section>
                </div>
              </PageShell>
            }
          />
          <Route
            path="/Buy"
            element={
              <PageShell
                eyebrow="Compras"
                title="Historial de compras"
                actions={
                  <>
                    <PurchaseDialog />
                    <BulkPurchaseDialog />
                  </>
                }
              >
                <BuyPage />
              </PageShell>
            }
          />
          <Route
            path="/Market"
            element={
              <PageShell eyebrow="Blight Market" title="Operacion de bastones">
                <section className="metrics">
                  <Metric icon={<History />} label="Fabricaciones" value={String(closedTicketsCount)} />
                  <Metric icon={<Package />} label="Bastones en stock" value={formatNumber(staffQuantity)} />
                </section>
                <StaffStockTab />
              </PageShell>
            }
          />
          <Route path="*" element={<Navigate to="/Stock" replace />} />
        </Routes>
      </main>
    </div>
  );
}
