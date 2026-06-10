import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FabricationTicketView } from "../../../electron/types";
import { categories, categoryLabels, formatCurrency, formatDate, tierLabels, tiers } from "../../app-data";
import { CloseTicketDialog, EmptyState, Recipe, TicketCosts, TicketDialogXL, TierBadge } from "../../Components";
import { useHistoryStore } from "../../stores/history-store";
import { useTicketStore } from "../../stores/ticket-store";
import "./TicketTab.scss";

export function TicketTab() {
  const tickets = useTicketStore((state) => state.tickets);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const consumptionSummary = useMemo(() => {
    const consumptions = closedTickets.flatMap((ticket) => ticket.consumptions);
    const materialSummary = categories.map((category) => ({
      key: category,
      label: categoryLabels[category],
      total: consumptions
        .filter((consumption) => consumption.category === category)
        .reduce((sum, consumption) => sum + consumption.discountedTotal, 0)
    }));
    const tierSummary = tiers.map((tier) => ({
      key: tier,
      label: tierLabels[tier],
      total: consumptions
        .filter((consumption) => consumption.tier === tier)
        .reduce((sum, consumption) => sum + consumption.discountedTotal, 0)
    }));
    const total = consumptions.reduce((sum, consumption) => sum + consumption.discountedTotal, 0);

    return { materialSummary, tierSummary, total };
  }, [closedTickets]);

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Tickets abiertos</h2>
          <span>Cierre con validacion de stock</span>
        </div>
        <TicketDialogXL />
      </div>
      <section className="ticket-summary" aria-label="Resumen de inversion consumida en tickets">
        <div className="ticket-summary__group">
          <div className="ticket-summary__group-head">
            <strong>Inversion por material</strong>
            <span>{formatCurrency(consumptionSummary.total)}</span>
          </div>
          <div className="ticket-summary__grid">
            {consumptionSummary.materialSummary.map((item) => (
              <article className="ticket-summary__item" key={item.key}>
                <span className="ticket-summary__label">{item.label}</span>
                <strong className="ticket-summary__value">{formatCurrency(item.total)}</strong>
              </article>
            ))}
          </div>
        </div>
        <div className="ticket-summary__group">
          <div className="ticket-summary__group-head">
            <strong>Inversion por tier</strong>
            <span>Tickets cerrados</span>
          </div>
          <div className="ticket-summary__grid">
            {consumptionSummary.tierSummary.map((item) => (
              <article className="ticket-summary__item" key={item.key}>
                <span className="ticket-summary__label">{item.label}</span>
                <strong className="ticket-summary__value">{formatCurrency(item.total)}</strong>
              </article>
            ))}
          </div>
        </div>
        <article className="ticket-summary__item ticket-summary__item--total">
          <span className="ticket-summary__label">Total consumido en tickets</span>
          <strong className="ticket-summary__value">{formatCurrency(consumptionSummary.total)}</strong>
        </article>
      </section>
      <div className="ticket-grid">
        {tickets.length === 0 ? <EmptyState text="No hay tickets abiertos." /> : null}
        {tickets.map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div className="ticket-card__head">
              <TierBadge tier={ticket.tier} />
              <span>{formatDate(ticket.openedAt)}</span>
            </div>
            <TicketCosts ticket={ticket} compact />
            <Recipe tier={ticket.tier} recipeId={ticket.recipeId} leftoverCredits={ticket.appliedLeftoverCredits} />
            <div className="ticket-card__actions">
              <CloseTicketDialog ticket={ticket} />
              <DeleteOpenTicketDialog ticket={ticket} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function DeleteOpenTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleteOpenTicket = useTicketStore((state) => state.deleteOpenTicket);

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      await deleteOpenTicket(ticket.id);
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo eliminar el ticket.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button danger" type="button">
          <Trash2 />
          Eliminar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Eliminar ticket {ticket.tier}</Dialog.Title>
          <Dialog.Description className="modal-copy">
            Elimina este ticket abierto y sus sobras aplicadas. No modifica stock ni historial.
          </Dialog.Description>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="modal-actions">
            <Dialog.Close asChild>
              <button className="button ghost" type="button">
                Cancelar
              </button>
            </Dialog.Close>
            <button className="button danger solid" type="button" onClick={remove} disabled={saving}>
              {saving ? <Loader2 className="spin" /> : <Trash2 />}
              Eliminar
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
