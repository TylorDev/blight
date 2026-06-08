import type { StaffStockMovementView } from "../../../../electron/types";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  staffMovementTypeLabels,
  staffQualityLabels,
  staffQualityToneClasses
} from "../../../app-data";
import { EmptyState, TierBadge } from "../../../Components";

type StaffMovementTableProps = {
  movements: StaffStockMovementView[];
};

export function StaffMovementTable({ movements }: StaffMovementTableProps) {
  if (movements.length === 0) {
    return <EmptyState text="No hay movimientos de bastones." />;
  }

  return (
    <div className="staff-market-table staff-market-table--movements">
      <div className="staff-market-row staff-market-row--head">
        <span>Fecha</span>
        <span>Tipo</span>
        <span>Tier</span>
        <span>Calidad</span>
        <span>Cantidad</span>
        <span>Total</span>
        <span>Motivo</span>
      </div>
      {movements.map((movement) => (
        <div className="staff-market-row" key={movement.id}>
          <span>{formatDate(movement.createdAt)}</span>
          <span>{staffMovementTypeLabels[movement.type]}</span>
          <TierBadge tier={movement.tier} />
          <span className={`staff-quality-chip ${staffQualityToneClasses[movement.quality]}`}>
            {staffQualityLabels[movement.quality]}
          </span>
          <strong>{formatNumber(movement.quantity)}</strong>
          <span>{formatCurrency(movement.total)}</span>
          <span>{movement.reason ?? (movement.ticketId ? `Ticket ${movement.ticketId.slice(0, 8)}` : "-")}</span>
        </div>
      ))}
    </div>
  );
}
