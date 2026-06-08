import { useMemo } from "react";
import type { FabricationTicketView, StaffStockLotView } from "../../../../electron/types";
import { formatCurrency, formatNumber, staffQualityLabels, staffQualityToneClasses } from "../../../app-data";
import { EmptyState, TicketDetailDialog, TierBadge } from "../../../Components";

type StaffStockTableProps = {
  items: StaffStockLotView[];
  tickets: FabricationTicketView[];
};

export function StaffStockTable({ items, tickets }: StaffStockTableProps) {
  const ticketsById = useMemo(() => new Map(tickets.map((ticket) => [ticket.id, ticket])), [tickets]);

  if (items.length === 0) {
    return <EmptyState text="No hay stock de bastones." />;
  }

  return (
    <div className="staff-market-table staff-market-table--stock">
      <div className="staff-market-row staff-market-row--head">
        <span>Tier</span>
        <span>Calidad</span>
        <span>Cantidad</span>
        <span>Coste</span>
        <span>Ticket</span>
      </div>
      {items.map((item) => (
        <StaffStockRow item={item} key={item.id} ticket={item.ticketId ? ticketsById.get(item.ticketId) : undefined} />
      ))}
    </div>
  );
}

function StaffStockRow({ item, ticket }: { item: StaffStockLotView; ticket?: FabricationTicketView }) {
  return (
    <div className="staff-market-row">
      <TierBadge tier={item.tier} />
      <span className={`staff-quality-chip ${staffQualityToneClasses[item.quality]}`}>
        {staffQualityLabels[item.quality]}
      </span>
      <strong>{formatNumber(item.quantity)}</strong>
      <span>{formatCurrency(item.unitCost)}</span>
      <span>
        {ticket ? (
          <TicketDetailDialog ticket={ticket}>
            <button className="staff-ticket-link" type="button">
              {item.ticketCode}
            </button>
          </TicketDetailDialog>
        ) : (
          item.ticketCode
        )}
      </span>
    </div>
  );
}
