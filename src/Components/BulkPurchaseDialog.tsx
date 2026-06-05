import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, PackagePlus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { AppTier, Category } from "../../electron/types";
import { categories, categoryLabels, createEmptyBulkDraft, tierLabels, tiers } from "../app-data";
import { normalizeThousandsInput, parseThousands } from "../number-format";
import { useStockStore } from "../stores/stock-store";
import { SelectField } from "./SelectField";
import { TierBadge } from "./TierBadge";

export function BulkPurchaseDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [draft, setDraft] = useState(() => createEmptyBulkDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createBulkPurchase = useStockStore((state) => state.createBulkPurchase);

  const updateDraft = (category: Category, field: "quantity" | "total", value: string) => {
    setDraft((current) => ({
      ...current,
      [category]: {
        ...current[category],
        [field]: value
      }
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const purchases = [];

      for (const category of categories) {
        const row = draft[category];
        const quantityFilled = row.quantity.trim() !== "";
        const totalFilled = row.total.trim() !== "";

        if (!quantityFilled && !totalFilled) {
          continue;
        }

        if (quantityFilled !== totalFilled) {
          throw new Error(`Completa Cantidad y Total en ${categoryLabels[category]} ${tier}.`);
        }

        const quantity = parseThousands(row.quantity);
        const total = parseThousands(row.total);

        if (quantity <= 0 || total <= 0) {
          throw new Error(`Cantidad y Total deben ser mayores a cero en ${categoryLabels[category]} ${tier}.`);
        }

        purchases.push({ category, quantity, total });
      }

      if (purchases.length === 0) {
        throw new Error("No hay compras para registrar.");
      }

      await createBulkPurchase({ tier, purchases });
      setDraft(createEmptyBulkDraft());
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
        <button className="button">
          <PackagePlus />
          Compra Masiva
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal bulk-modal">
          <Dialog.Title>Compra Masiva</Dialog.Title>
          <Dialog.Description className="sr-only">
            Registra varias compras para un mismo tier completando cantidad y total por item.
          </Dialog.Description>
          <form onSubmit={submit} className="form">
            <SelectField
              label="Tier"
              value={tier}
              onValueChange={(value) => setTier(value as AppTier)}
              options={tiers}
              labels={tierLabels}
            />
            <div className="bulk-table">
              <div className="bulk-row bulk-head">
                <span>Item</span>
                <span>Cantidad</span>
                <span>Total</span>
              </div>
              {categories.map((category) => (
                <div className="bulk-row" key={category}>
                  <span className="bulk-item-label">
                    {categoryLabels[category]} <TierBadge tier={tier} />
                  </span>
                  <input
                    value={draft[category].quantity}
                    onChange={(event) => updateDraft(category, "quantity", normalizeThousandsInput(event.target.value))}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    placeholder="Sin cambio"
                  />
                  <input
                    value={draft[category].total}
                    onChange={(event) => updateDraft(category, "total", normalizeThousandsInput(event.target.value))}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    placeholder="Sin cambio"
                  />
                </div>
              ))}
            </div>
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
