import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { FabricationTicketView } from "../../../electron/types";
import { categoryLabels, formatCurrency, formatDate } from "../../app-data";
import { EmptyState, Recipe, TicketCosts, TierBadge } from "../../Components";
import { normalizeThousandsInput, parseThousands } from "../../number-format";
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
            <Recipe tier={ticket.tier} leftoverCredits={ticket.appliedLeftoverCredits} />
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTicket = useTicketStore((state) => state.closeTicket);
  const clearTicketError = useTicketStore((state) => state.clearError);
  const setMissingMaterials = useTicketStore((state) => state.setMissingMaterials);
  const loadStock = useStockStore((state) => state.loadStock);
  const loadHistory = useHistoryStore((state) => state.loadHistory);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    clearTicketError();
    setMissingMaterials([]);

    try {
      const result = await closeTicket({
        ticketId: ticket.id,
        filledDiariesQuantity: parseThousands(filledDiariesQuantity),
        filledDiariesDiscount: parseThousands(filledDiariesDiscount),
        leftoverTablesQuantity: parseThousands(leftoverTablesQuantity),
        leftoverClothsQuantity: parseThousands(leftoverClothsQuantity)
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
          <Dialog.Description className="sr-only">
            Cierra el ticket registrando diarios llenos y nuevas sobras para futuros tickets.
          </Dialog.Description>
          <form onSubmit={submit} className="form">
            <label className="field">
              Cantidad de diarios llenos
              <input
                value={filledDiariesQuantity}
                onChange={(event) => setFilledDiariesQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Descuento por diarios llenos
              <input
                value={filledDiariesDiscount}
                onChange={(event) => setFilledDiariesDiscount(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Cantidad de Tablas Sobrantes
              <input
                value={leftoverTablesQuantity}
                onChange={(event) => setLeftoverTablesQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Cantidad de Telas Sobrantes
              <input
                value={leftoverClothsQuantity}
                onChange={(event) => setLeftoverClothsQuantity(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
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
