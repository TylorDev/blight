import type { FabricationTicketView } from "../../../electron/types";
import { categoryLabels, formatCurrency, formatDate } from "../../app-data";
import { EmptyState, TicketCosts, TierBadge } from "../../components";
import { useHistoryStore } from "../../stores/history-store";
import "./HistoryTab.scss";

export function HistoryTab() {
  const tickets = useHistoryStore((state) => state.tickets);

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Historial</h2>
          <span>{tickets.length} tickets cerrados</span>
        </div>
      </div>
      <HistoryTable tickets={tickets} />
    </>
  );
}

function HistoryTable({ tickets }: { tickets: FabricationTicketView[] }) {
  if (tickets.length === 0) {
    return <EmptyState text="No hay fabricaciones cerradas." />;
  }

  return (
    <div className="history-list">
      {tickets.map((ticket) => (
        <article className="history-item" key={ticket.id}>
          <div className="history-title">
            <TierBadge tier={ticket.tier} />
            <span>{ticket.closedAt ? formatDate(ticket.closedAt) : ""}</span>
          </div>
          <TicketCosts ticket={ticket} />
          <div className="consumption-list">
            {ticket.consumptions.map((item) => (
              <span key={item.id}>
                {categoryLabels[item.category]} {item.quantity} - {formatCurrency(item.discountedTotal)}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
