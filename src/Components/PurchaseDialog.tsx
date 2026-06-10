import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, Plus, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { AppTier, Category, PurchaseVendorView } from "../../electron/types";
import { categories, categoryLabels, purchaseVendorLabels, purchaseVendors, tierLabels, tiers } from "../app-data";
import { formatThousands, parseThousands } from "../number-format";
import {
  createEmptyPurchaseCalculation,
  type PurchaseCalculationState,
  updatePurchaseCalculation
} from "../purchase-calculator";
import { useStockStore } from "../stores/stock-store";
import { SelectField } from "./SelectField";

interface PurchaseDialogProps {
  initialAverageCost?: number;
  initialCategory?: Category;
  initialTier?: AppTier;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  showTrigger?: boolean;
}

export function PurchaseDialog({
  initialAverageCost,
  initialCategory = "TABLAS",
  initialTier = "T5",
  onOpenChange,
  open: controlledOpen,
  showTrigger = true
}: PurchaseDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [category, setCategory] = useState<Category>(initialCategory);
  const [tier, setTier] = useState<AppTier>(initialTier);
  const [vendor, setVendor] = useState<PurchaseVendorView>("PARTICULAR");
  const [draft, setDraft] = useState(() => createEmptyPurchaseCalculation());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPurchase = useStockStore((state) => state.createPurchase);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCategory(initialCategory);
    setTier(initialTier);
    setDraft(createInitialDraft(initialAverageCost));
    setError(null);
  }, [initialAverageCost, initialCategory, initialTier, open]);

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
        total: parseThousands(draft.total),
        vendor
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
      {showTrigger ? (
        <Dialog.Trigger asChild>
          <button className="button">
            <Plus />
            Compra
          </button>
        </Dialog.Trigger>
      ) : null}
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
            <SelectField
              label="Vendedor"
              value={vendor}
              onValueChange={(value) => setVendor(value as PurchaseVendorView)}
              options={purchaseVendors}
              labels={purchaseVendorLabels}
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

function createInitialDraft(initialAverageCost?: number): PurchaseCalculationState {
  if (!initialAverageCost || initialAverageCost <= 0) {
    return createEmptyPurchaseCalculation();
  }

  return {
    ...createEmptyPurchaseCalculation(),
    averageCost: formatThousands(String(Math.trunc(initialAverageCost))),
    origins: {
      quantity: null,
      averageCost: "manual",
      total: null
    }
  };
}
