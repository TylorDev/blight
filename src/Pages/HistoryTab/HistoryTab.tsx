import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FabricationTicketView } from "../../../electron/types";
import { formatCurrency, formatDate } from "../../app-data";
import { EmptyState, TicketDetailDialog, TierBadge } from "../../Components";
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
        {tickets.length > 0 ? <ClearHistoryDialog /> : null}
      </div>
      <HistoryTable tickets={tickets} />
    </>
  );
}

function ClearHistoryDialog() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearHistory = useHistoryStore((state) => state.clearHistory);

  const clear = async () => {
    setSaving(true);
    setError(null);
    try {
      await clearHistory();
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo vaciar el historial.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button danger">
          <Trash2 />
          Vaciar historial
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Vaciar historial</Dialog.Title>
          <Dialog.Description className="modal-copy">
            Elimina todos los tickets cerrados y sus registros de consumo. No modifica stock ni compras.
          </Dialog.Description>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <Dialog.Close asChild>
              <button className="button ghost" type="button">
                Cancelar
              </button>
            </Dialog.Close>
            <button className="button danger solid" type="button" onClick={clear} disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <Trash2 />}
              Vaciar
            </button>
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

function HistoryTable({ tickets }: { tickets: FabricationTicketView[] }) {
  if (tickets.length === 0) {
    return <EmptyState text="No hay fabricaciones cerradas." />;
  }

  return (
    <div className="history-list">
      {tickets.map((ticket) => <HistoryTicketDialog key={ticket.id} ticket={ticket} />)}
    </div>
  );
}

function HistoryTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const closedDate = ticket.closedAt ? formatDate(ticket.closedAt) : "";

  return (
    <TicketDetailDialog ticket={ticket}>
      <button className="history-item" type="button">
        <div className="history-title">
          <TierBadge tier={ticket.tier} />
          <span>Ver detalles</span>
        </div>
        <div className="history-summary">
          <span>
            <strong>Fecha:</strong>
            {closedDate}
          </span>
          <span>
            <strong>Inversion total despues de descuentos:</strong>
            {formatCurrency(ticket.investmentTotal)}
          </span>
          <span>
            <strong>Precio Baston:</strong>
            {formatCurrency(ticket.unitCost)}
          </span>
        </div>
      </button>
    </TicketDetailDialog>
  );
}
