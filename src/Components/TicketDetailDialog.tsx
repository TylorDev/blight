import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenCheck, Package, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Category, FabricationTicketView } from "../../electron/types";
import {
  categoryLabels,
  formatCurrency,
  formatDate,
  formatNumber,
  staffQualityLabels,
  staffQualityToneClasses
} from "../app-data";
import { TicketCosts } from "./TicketCosts";
import fabricIcon from "../Resources/fabric.svg";
import woodIcon from "../Resources/wood.svg";

type TicketDetailDialogProps = {
  children: ReactNode;
  ticket: FabricationTicketView;
};

const consumptionToneClasses: Record<Category, string> = {
  TABLAS: "consumption-item--wood",
  TELAS: "consumption-item--fabric",
  DIARIOS_VACIOS: "consumption-item--diary",
  ARTEFACTOS: "consumption-item--artifact"
};

function ConsumptionIcon({ category }: { category: Category }) {
  if (category === "TABLAS") {
    return <img src={woodIcon} alt="" />;
  }

  if (category === "TELAS") {
    return <img src={fabricIcon} alt="" />;
  }

  if (category === "DIARIOS_VACIOS") {
    return <BookOpenCheck />;
  }

  return <Package />;
}

export function TicketDetailDialog({ children, ticket }: TicketDetailDialogProps) {
  const closedDate = ticket.closedAt ? formatDate(ticket.closedAt) : "";
  const producedStaffs = ticket.producedStaffs.filter((staff) => staff.quantity > 0);

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal history-modal">
          <div className="history-modal__head">
            <Dialog.Title>Ticket {ticket.tier}</Dialog.Title>
            <span>{closedDate}</span>
          </div>
          <Dialog.Description className="sr-only">
            Detalle completo del ticket cerrado, incluyendo costos y consumos.
          </Dialog.Description>
          <TicketCosts ticket={ticket} />
          {producedStaffs.length > 0 ? (
            <div className="staff-quality-list">
              {producedStaffs.map((staff) => (
                <span className={`staff-quality-item ${staffQualityToneClasses[staff.quality]}`} key={staff.id}>
                  <b>{staffQualityLabels[staff.quality]}</b>
                  <strong>{formatNumber(staff.quantity)}</strong>
                </span>
              ))}
            </div>
          ) : null}
          <div className="consumption-list">
            {ticket.consumptions.map((item) => (
              <div className={`consumption-item ${consumptionToneClasses[item.category]}`} key={item.id}>
                <span className="consumption-item__icon">
                  <ConsumptionIcon category={item.category} />
                </span>
                <span className="consumption-item__meta">
                  <b>{categoryLabels[item.category]}</b>
                  <small>Cantidad {formatNumber(item.quantity)}</small>
                </span>
                <strong className="consumption-item__value">{formatCurrency(item.discountedTotal)}</strong>
              </div>
            ))}
          </div>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
