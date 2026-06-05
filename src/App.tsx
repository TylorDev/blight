import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  Archive,
  Check,
  CircleDollarSign,
  Factory,
  History,
  Loader2,
  PackagePlus,
  Plus,
  Trash2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AppTier, Category } from "../electron/types";
import {
  calculateTicketPreview,
  categories,
  categoryLabels,
  createEmptyBulkDraft,
  formatCurrency,
  formatNumber,
  staffQuantity,
  tierLabels,
  tiers
} from "./app-data";
import { Metric, Recipe, SelectField, TierBadge } from "./components";
import { HistoryTab } from "./Pages/HistoryTab/HistoryTab";
import { StockTab } from "./Pages/StockTab/StockTab";
import { TicketTab } from "./Pages/TicketTab/TicketTab";
import { useHistoryStore } from "./stores/history-store";
import { selectStockTotals, useStockStore } from "./stores/stock-store";
import { useTicketStore } from "./stores/ticket-store";

function App() {
  const stockError = useStockStore((state) => state.error);
  const loadStock = useStockStore((state) => state.loadStock);
  const totals = useStockStore(selectStockTotals);
  const openTicketsCount = useTicketStore((state) => state.tickets.length);
  const ticketError = useTicketStore((state) => state.error);
  const missingMaterials = useTicketStore((state) => state.missingMaterials);
  const loadTickets = useTicketStore((state) => state.loadTickets);
  const closedTicketsCount = useHistoryStore((state) => state.tickets.length);
  const historyError = useHistoryStore((state) => state.error);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    void Promise.all([loadStock(), loadTickets(), loadHistory()])
      .catch(() => undefined)
      .finally(() => setInitialLoading(false));
  }, [loadHistory, loadStock, loadTickets]);

  const errors = [stockError, ticketError, historyError].filter(Boolean);

  if (initialLoading) {
    return (
      <div className="boot">
        <Loader2 className="spin" />
        <span>Cargando inventario</span>
      </div>
    );
  }

  return (
    <Tooltip.Provider>
      <main className="app-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Blight</p>
            <h1>Inventario y fabricacion</h1>
          </div>
          <div className="actions">
            <PurchaseDialog />
            <BulkPurchaseDialog />
            <ClearStockDialog />
            <TicketDialog />
          </div>
        </header>

        <section className="metrics">
          <Metric icon={<Archive />} label="Stock total" value={formatNumber(totals.quantity)} />
          <Metric icon={<CircleDollarSign />} label="Valor inventario" value={formatCurrency(totals.total)} />
          <Metric icon={<Factory />} label="Tickets abiertos" value={String(openTicketsCount)} />
          <Metric icon={<History />} label="Fabricaciones" value={String(closedTicketsCount)} />
        </section>

        {errors.map((error) => (
          <div className="notice danger" key={error}>
            {error}
          </div>
        ))}
        {missingMaterials.length > 0 ? (
          <div className="notice danger">
            Faltan materiales: {missingMaterials.join(", ")}
          </div>
        ) : null}

        <Tabs.Root defaultValue="stock" className="workspace">
          <Tabs.List className="tab-list">
            <Tabs.Trigger value="stock">Inventario</Tabs.Trigger>
            <Tabs.Trigger value="tickets">Tickets</Tabs.Trigger>
            <Tabs.Trigger value="history">Historial</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="stock" className="panel">
            <StockTab />
          </Tabs.Content>

          <Tabs.Content value="tickets" className="panel">
            <TicketTab />
          </Tabs.Content>

          <Tabs.Content value="history" className="panel">
            <HistoryTab />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </Tooltip.Provider>
  );
}

function ClearStockDialog() {
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
          <p className="modal-copy">Deja cantidades, totales y precios medios en cero. No borra historial ni tickets.</p>
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

function BulkPurchaseDialog() {
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

        const quantity = Number(row.quantity);
        const total = Number(row.total);

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
                    onChange={(event) => updateDraft(category, "quantity", event.target.value)}
                    type="number"
                    min="1"
                    placeholder="Sin cambio"
                  />
                  <input
                    value={draft[category].total}
                    onChange={(event) => updateDraft(category, "total", event.target.value)}
                    type="number"
                    min="1"
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

function PurchaseDialog() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("TABLAS");
  const [tier, setTier] = useState<AppTier>("T5");
  const [quantity, setQuantity] = useState("1");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createPurchase = useStockStore((state) => state.createPurchase);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createPurchase({
        category,
        tier,
        quantity: Number(quantity),
        total: Number(total)
      });
      setOpen(false);
      setQuantity("1");
      setTotal("");
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
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="1" />
            </label>
            <label className="field">
              Precio total
              <input value={total} onChange={(event) => setTotal(event.target.value)} type="number" min="1" />
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

function TicketDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [tax, setTax] = useState("1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stock = useStockStore((state) => state.stock);
  const createTicket = useTicketStore((state) => state.createTicket);
  const preview = useMemo(() => calculateTicketPreview(stock, tier, Number(tax)), [stock, tax, tier]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createTicket({ tier, tax: Number(tax) });
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
              <input value={tax} onChange={(event) => setTax(event.target.value)} type="number" min="1" max="1000" />
            </label>
            <label className="field">
              Cantidad Bastones Total
              <input value={String(staffQuantity)} readOnly />
            </label>
            <Recipe tier={tier} />
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

function TicketPreview({
  preview
}: {
  preview: ReturnType<typeof calculateTicketPreview>;
}) {
  return (
    <section className="ticket-preview">
      <div className="preview-head">
        <strong>Costo estimado</strong>
        <span>Stock actual</span>
      </div>
      <div className="preview-lines">
        {preview.materials.map((material) => (
          <div className="preview-line" key={material.category}>
            <span>
              {categoryLabels[material.category]} x {material.quantity}
            </span>
            <span>{formatCurrency(material.averageCost)}</span>
            <strong>{formatCurrency(material.subtotal)}</strong>
          </div>
        ))}
      </div>
      <div className="preview-totals">
        <span>Materiales {formatCurrency(preview.materialTotal)}</span>
        <span>Crafting Tax por unidad {formatCurrency(preview.craftingTaxUnit)}</span>
        <span>Crafting Tax total {formatCurrency(preview.craftingTaxTotal)}</span>
        <strong>Inversion Total {formatCurrency(preview.investmentTotal)}</strong>
        <strong>Precio promedio por baston {formatCurrency(preview.unitCost)}</strong>
      </div>
    </section>
  );
}

export default App;
