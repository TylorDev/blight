import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppTier, Category } from "../../electron/types";
import { categories, categoryLabels, tierLabels, tiers } from "../app-data";
import { parseThousands } from "../number-format";
import { createEmptyPurchaseCalculation, updatePurchaseCalculation } from "../purchase-calculator";
import { useStockStore } from "../stores/stock-store";
import { SelectField } from "./SelectField";

export function PurchaseDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("TABLAS");
  const [tier, setTier] = useState<AppTier>("T5");
  const [draft, setDraft] = useState(() => createEmptyPurchaseCalculation());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPurchase = useStockStore((state) => state.createPurchase);

  const updateDraft = (field: "quantity" | "averageCost" | "total", value: string) => {
    setDraft((current) => updatePurchaseCalculation(current, field, value));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPurchase({
        category,
        tier,
        quantity: parseThousands(draft.quantity),
        total: parseThousands(draft.total)
      });
      setOpen(false);
      setDraft(createEmptyPurchaseCalculation());
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button">
          <Plus />
          Compra
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Registrar compra</Dialog.Title>
          <Dialog.Description className="sr-only">
            Registra una compra individual seleccionando categoria, tier, cantidad y precio total.
          </Dialog.Description>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Categoria"
              value={category}
              onValueChange={(value) => setCategory(value as Category)}
              options={categories}
              labels={categoryLabels}
            />
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={tierLabels}
            />
            <label className="field">
              Cantidad
              <input
                value={draft.quantity}
                onChange={(event) => updateDraft("quantity", event.target.value)}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Precio promedio
              <input
                value={draft.averageCost}
                onChange={(event) => updateDraft("averageCost", event.target.value)}
                type="text"
                inputMode="numeric"
                pattern="[0-9.]*"
              />
            </label>
            <label className="field">
              Precio total
              <input
                value={draft.total}
                onChange={(event) => updateDraft("total", event.target.value)}
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
                Guardar
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
