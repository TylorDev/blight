import * as Dialog from "@radix-ui/react-dialog";
import { BadgeDollarSign, Factory, Loader2, Plus, Sparkles, WandSparkles, X } from "lucide-react";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import type { AppTier, LeftoverCreditView } from "../../electron/types";
import {
  calculateTicketPreview,
  categoryLabels,
  formatCurrency,
  formatNumber,
  getDefaultTicketTax,
  staffQuantity,
  tierLabels,
  tiers
} from "../app-data";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../number-format";
import { useHistoryStore } from "../stores/history-store";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import { Recipe } from "./Recipe";
import { TicketPreview } from "./TicketPreview";
import staffIcon from "../Resources/staff.svg";

const tierColors: Record<AppTier, string> = {
  T5: "#76221A",
  T6: "#C36E2B",
  T7: "#D6B446",
  T8: "#D3CEC7"
};

export function TicketDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [tax, setTax] = useState("");
  const [pendingLeftovers, setPendingLeftovers] = useState<LeftoverCreditView[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingLeftovers, setLoadingLeftovers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stock = useStockStore((state) => state.stock);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const createTicket = useTicketStore((state) => state.createTicket);
  const listPendingLeftoverCredits = useTicketStore((state) => state.listPendingLeftoverCredits);
  const defaultTax = useMemo(() => getDefaultTicketTax(closedTickets), [closedTickets]);
  const effectiveTax = tax === "" ? defaultTax : parseThousands(tax);
  const preview = useMemo(
    () => calculateTicketPreview(stock, tier, effectiveTax, pendingLeftovers),
    [effectiveTax, pendingLeftovers, stock, tier]
  );
  const pendingLeftoverTotal = pendingLeftovers.reduce((total, credit) => total + credit.value, 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    setLoadingLeftovers(true);
    listPendingLeftoverCredits(tier)
      .then(setPendingLeftovers)
      .catch((currentError) =>
        setError(currentError instanceof Error ? currentError.message : "No se pudieron cargar las sobras.")
      )
      .finally(() => setLoadingLeftovers(false));
  }, [listPendingLeftoverCredits, open, tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTicket({ tier, tax: effectiveTax });
      setTax("");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <Factory />
          Ticket
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal ticket-dialog">
   
          <form onSubmit={submit} className="form ticket-dialog__form">
            <section className="ticket-dialog__section">
              <div className="ticket-dialog__section-head">
                <strong>Tier de fabricacion</strong>
                <span>Seleccion activa: {tierLabels[tier]}</span>
              </div>
              <div className="ticket-dialog__tier-grid">
                {tiers.map((currentTier) => (
                  <button
                    aria-pressed={tier === currentTier}
                    className="ticket-tier-option"
                    key={currentTier}
                    onClick={() => setTier(currentTier)}
                    style={{ "--ticket-tier-color": tierColors[currentTier] } as CSSProperties}
                    type="button"
                  >
                    <span className="ticket-tier-option__mark" />
                    <strong>{tierLabels[currentTier]}</strong>
                  </button>
                ))}
              </div>
            </section>
            <div className="ticket-dialog__inputs">
              <label className="field ticket-dialog__field">
                <span>
                  <BadgeDollarSign />
                  Tax
                </span>
                <input
                  value={tax}
                  onChange={(event) => setTax(normalizeThousandsInput(event.target.value))}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9.]*"
                  placeholder={formatThousands(String(defaultTax))}
                  aria-label={`Tax, por defecto ${formatNumber(defaultTax)}`}
                />
              </label>
              <label className="field ticket-dialog__field">
                <span>
                  <WandSparkles />
                  Cantidad Bastones Total
                </span>
                <input value={String(staffQuantity)} readOnly />
              </label>
            </div>
            {loadingLeftovers ? <p className="modal-copy">Buscando sobras disponibles...</p> : null}
            {!loadingLeftovers && pendingLeftovers.length > 0 ? (
              <div className="leftover-note">
                <div className="leftover-note__head">
                  <Sparkles />
                  <strong>Sobras aplicadas al crear</strong>
                  <span>Descuento total {formatCurrency(pendingLeftoverTotal)}</span>
                </div>
                <div className="leftover-note__rows">
                  {pendingLeftovers.map((credit) => (
                    <div className="leftover-note__row" key={credit.id}>
                      <span>{categoryLabels[credit.category]}</span>
                      <strong>{credit.quantity}</strong>
                      <b>{formatCurrency(credit.value)}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <section className="ticket-dialog__section">
              <div className="ticket-dialog__section-head">
                <strong>Receta efectiva</strong>
                <span>Stock y sobras ya considerados</span>
              </div>
              <Recipe tier={tier} leftoverCredits={pendingLeftovers} />
            </section>
            <TicketPreview preview={preview} />
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Plus />}
                Crear
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
