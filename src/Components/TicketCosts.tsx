import type { FabricationTicketView } from "../../electron/types";
import { formatCurrency } from "../app-data";

export function TicketCosts({ ticket, compact = false }: { ticket: FabricationTicketView; compact?: boolean }) {
  return (
    <div className={compact ? "cost-grid compact" : "cost-grid"}>
      <span>Tax {formatCurrency(ticket.tax)}</span>
      <span>Crafting Tax {formatCurrency(ticket.craftingTax)}</span>
      <span>Bastones {ticket.staffQuantity}</span>
      {!compact ? <span>Materiales {formatCurrency(ticket.materialTotal)}</span> : null}
      {!compact ? <span>Diarios llenos {ticket.filledDiariesQuantity}</span> : null}
      {!compact ? <span>Descuento diarios {formatCurrency(ticket.filledDiariesDiscount)}</span> : null}
      {!compact ? <span>Sobras tablas {ticket.leftoverTablesQuantity} - {formatCurrency(ticket.leftoverTablesValue)}</span> : null}
      {!compact ? <span>Sobras telas {ticket.leftoverClothsQuantity} - {formatCurrency(ticket.leftoverClothsValue)}</span> : null}
      {!compact ? <span>Sobras aplicadas {formatCurrency(ticket.appliedLeftoverDiscount)}</span> : null}
      {!compact ? <span>Inversion Total {formatCurrency(ticket.investmentTotal)}</span> : null}
      {!compact ? <span>Precio de cada baston {formatCurrency(ticket.unitCost)}</span> : null}
    </div>
  );
}
