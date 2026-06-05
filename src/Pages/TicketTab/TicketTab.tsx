import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { FabricationTicketView, LeftoverCreditView } from "../../../electron/types";
import { categoryLabels, formatCurrency, formatDate } from "../../app-data";
import { EmptyState, Recipe, TicketCosts, TierBadge } from "../../components";
import { useHistoryStore } from "../../stores/history-store";
import { useStockStore } from "../../stores/stock-store";
import { useTicketStore } from "../../stores/ticket-store";
import "./TicketTab.scss";

export function TicketTab() {
  const tickets = useTicketStore((state) => state.tickets);

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Tickets abiertos</h2>
          <span>Cierre con validacion de stock</span>
        </div>
      </div>
      <div className="ticket-grid">
        {tickets.length === 0 ? <EmptyState text="No hay tickets abiertos." /> : null}
        {tickets.map((ticket) => (
          <article className="ticket-card" key={ticket.id}>
            <div className="ticket-card__head">
              <TierBadge tier={ticket.tier} />
              <span>{formatDate(ticket.openedAt)}</span>
            </div>
            <TicketCosts ticket={ticket} compact />
            <Recipe tier={ticket.tier} />
            <CloseTicketDialog ticket={ticket} />
          </article>
        ))}
      </div>
    </>
  );
}

function CloseTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const [open, setOpen] = useState(false);
  const [filledDiariesQuantity, setFilledDiariesQuantity] = useState("0");
  const [filledDiariesDiscount, setFilledDiariesDiscount] = useState("0");
  const [leftoverTablesQuantity, setLeftoverTablesQuantity] = useState("0");
  const [leftoverClothsQuantity, setLeftoverClothsQuantity] = useState("0");
  const [pendingCredits, setPendingCredits] = useState<LeftoverCreditView[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTicket = useTicketStore((state) => state.closeTicket);
  const clearTicketError = useTicketStore((state) => state.clearError);
  const setMissingMaterials = useTicketStore((state) => state.setMissingMaterials);
  const listPendingLeftoverCredits = useTicketStore((state) => state.listPendingLeftoverCredits);
  const loadStock = useStockStore((state) => state.loadStock);
  const loadHistory = useHistoryStore((state) => state.loadHistory);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingCredits(true);
    listPendingLeftoverCredits(ticket.tier)
      .then(setPendingCredits)
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar las sobras.")
      )
      .finally(() => setLoadingCredits(false));
  }, [listPendingLeftoverCredits, open, ticket.tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    clearTicketError();
    setMissingMaterials([]);

    try {
      const result = await closeTicket({
        ticketId: ticket.id,
        filledDiariesQuantity: Number(filledDiariesQuantity),
        filledDiariesDiscount: Number(filledDiariesDiscount),
        leftoverTablesQuantity: Number(leftoverTablesQuantity),
        leftoverClothsQuantity: Number(leftoverClothsQuantity)
      });

      if (!result.ok) {
        return;
      }

      await Promise.all([loadStock(), loadHistory()]);
      setOpen(false);
      setFilledDiariesQuantity("0");
      setFilledDiariesDiscount("0");
      setLeftoverTablesQuantity("0");
      setLeftoverClothsQuantity("0");
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "No se pudo cerrar el ticket.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const pendingTotal = pendingCredits.reduce((total, credit) => total + credit.value, 0);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Check />
          Cerrar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Cerrar ticket {ticket.tier}</Dialog.Title>
          <form onSubmit={submit} className="form">
            <div className="pending-box">
              <strong>Sobras pendientes</strong>
              {loadingCredits ? <span>Cargando...</span> : null}
              {!loadingCredits && pendingCredits.length === 0 ? <span>Sin sobras para aplicar.</span> : null}
              {!loadingCredits && pendingCredits.length > 0 ? (
                <>
                  <div className="consumption-list">
                    {pendingCredits.map((credit) => (
                      <span key={credit.id}>
                        {categoryLabels[credit.category]} {credit.quantity} - {formatCurrency(credit.value)}
                      </span>
                    ))}
                  </div>
                  <span>Total aplicado {formatCurrency(pendingTotal)}</span>
                </>
              ) : null}
            </div>
            <label className="field">
              Cantidad de diarios llenos
              <input
                value={filledDiariesQuantity}
                onChange={(event) => setFilledDiariesQuantity(event.target.value)}
                type="number"
                min="0"
              />
            </label>
            <label className="field">
              Descuento por diarios llenos
              <input
                value={filledDiariesDiscount}
                onChange={(event) => setFilledDiariesDiscount(event.target.value)}
                type="number"
                min="0"
              />
            </label>
            <label className="field">
              Cantidad de Tablas Sobrantes
              <input
                value={leftoverTablesQuantity}
                onChange={(event) => setLeftoverTablesQuantity(event.target.value)}
                type="number"
                min="0"
                max="73"
              />
            </label>
            <label className="field">
              Cantidad de Telas Sobrantes
              <input
                value={leftoverClothsQuantity}
                onChange={(event) => setLeftoverClothsQuantity(event.target.value)}
                type="number"
                min="0"
                max="44"
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Check />}
                Cerrar
              </button>
            </div>
          </form>
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
