import * as Dialog from "@radix-ui/react-dialog";
import { Factory, Loader2, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AppTier, LeftoverCreditView } from "../../electron/types";
import { calculateTicketPreview, categoryLabels, formatCurrency, staffQuantity, tierLabels, tiers } from "../app-data";
import { normalizeThousandsInput, parseThousands } from "../number-format";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import { Recipe } from "./Recipe";
import { SelectField } from "./SelectField";
import { TicketPreview } from "./TicketPreview";

export function TicketDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [tax, setTax] = useState("1");
  const [pendingLeftovers, setPendingLeftovers] = useState<LeftoverCreditView[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingLeftovers, setLoadingLeftovers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stock = useStockStore((state) => state.stock);
  const createTicket = useTicketStore((state) => state.createTicket);
  const listPendingLeftoverCredits = useTicketStore((state) => state.listPendingLeftoverCredits);
  const preview = useMemo(
    () => calculateTicketPreview(stock, tier, parseThousands(tax), pendingLeftovers),
    [pendingLeftovers, stock, tax, tier]
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
      await createTicket({ tier, tax: parseThousands(tax) });
      setTax("1");
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
        <Dialog.Content className="modal">
          <Dialog.Title>Nuevo ticket</Dialog.Title>
          <Dialog.Description className="sr-only">
            Crea un ticket de fabricacion seleccionando tier, tax y revisando el costo estimado.
          </Dialog.Description>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={tierLabels}
            />
            <label className="field">
              Tax
              <input
                value={tax}
                onChange={(event) => setTax(normalizeThousandsInput(event.target.value))}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Cantidad Bastones Total
              <input value={String(staffQuantity)} readOnly />
            </label>
            {loadingLeftovers ? <p className="modal-copy">Buscando sobras disponibles...</p> : null}
            {!loadingLeftovers && pendingLeftovers.length > 0 ? (
              <div className="leftover-note">
                <strong>Sobras aplicadas al crear</strong>
                <div className="consumption-list">
                  {pendingLeftovers.map((credit) => (
                    <span key={credit.id}>
                      {categoryLabels[credit.category]} {credit.quantity} - {formatCurrency(credit.value)}
                    </span>
                  ))}
                </div>
                <span>Descuento total {formatCurrency(pendingLeftoverTotal)}</span>
              </div>
            ) : null}
            <Recipe tier={tier} leftoverCredits={pendingLeftovers} />
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
