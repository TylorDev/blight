import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useStockStore } from "../stores/stock-store";

export function ClearStockDialog() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearStock = useStockStore((state) => state.clearStock);

  const clear = async () => {
    setSaving(true);
    setError(null);
    try {
      await clearStock();
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo vaciar el stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button danger">
          <Trash2 />
          Vaciar Stock
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Vaciar Stock</Dialog.Title>
          <Dialog.Description className="modal-copy">
            Deja cantidades, totales y precios medios en cero. No borra historial ni tickets.
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
