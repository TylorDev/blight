import * as Dialog from "@radix-ui/react-dialog";
import { CircleDollarSign, Loader2, Package, SlidersHorizontal, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  AppTier,
  StaffQualityView,
  StaffStockItemView,
  StaffStockLotView,
  StaffStockMovementView
} from "../../../electron/types";
import {
  FilterValue,
  formatCurrency,
  formatDate,
  formatNumber,
  staffMovementTypeLabels,
  staffQualities,
  staffQualityLabels,
  tierLabels,
  tiers
} from "../../app-data";
import { EmptyState, SelectField, TierBadge } from "../../Components";
import { normalizeThousandsInput, parseThousands } from "../../number-format";
import { useStaffStockStore } from "../../stores/staff-stock-store";
import "./StaffStockTab.scss";

export function StaffStockTab() {
  const stock = useStaffStockStore((state) => state.stock);
  const lots = useStaffStockStore((state) => state.lots);
  const movements = useStaffStockStore((state) => state.movements);
  const tierFilter = useStaffStockStore((state) => state.tierFilter);
  const qualityFilter = useStaffStockStore((state) => state.qualityFilter);
  const setTierFilter = useStaffStockStore((state) => state.setTierFilter);
  const setQualityFilter = useStaffStockStore((state) => state.setQualityFilter);
  const loadStaffStock = useStaffStockStore((state) => state.loadStaffStock);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadStaffMovements = useStaffStockStore((state) => state.loadStaffMovements);
  const staffInStock = stock.reduce((total, item) => total + item.quantity, 0);
  const totalSales = movements
    .filter((movement) => movement.type === "VENTA")
    .reduce((total, movement) => total + movement.total, 0);
  const filteredLots = useMemo(() => {
    return lots.filter((item) => {
      const tierMatches = tierFilter === "TODOS" || item.tier === tierFilter;
      const qualityMatches = qualityFilter === "TODOS" || item.quality === qualityFilter;
      return tierMatches && qualityMatches;
    });
  }, [lots, qualityFilter, tierFilter]);

  useEffect(() => {
    void Promise.all([loadStaffStock(), loadStaffStockLots(), loadStaffMovements()]).catch(() => undefined);
  }, [loadStaffMovements, loadStaffStock, loadStaffStockLots]);

  return (
    <section className="staff-layout">
      <div className="staff-market-hero">
        <div>
          <p className="staff-market-kicker">Market</p>
          <h2>Bastones en el stock</h2>
          <span>{formatNumber(staffInStock)} unidades listas</span>
        </div>
        <div className="staff-market-actions">
          <SellStaffDialog stock={stock} />
          <AdjustStaffDialog />
        </div>
      </div>

      <div className="staff-market-metrics">
        <StaffMetric label="Bastones en el stock" value={formatNumber(staffInStock)} />
        <StaffMetric label="Ventas totales" value={formatCurrency(totalSales)} />
        <StaffMetric label="Ganancias totales" value="-" />
        <StaffMetric label="Bastones en proceso de venta" value="-" />
        <StaffMetric label="Valor del stock" value="-" />
        <StaffMetric label="Valor de bastones en proceso de venta" value="-" />
      </div>

      <div className="staff-market-grid">
        <section className="staff-market-card staff-market-card--stock">
          <div className="staff-market-card-head">
            <div>
              <h3>Stock</h3>
              <span>{formatNumber(filteredLots.reduce((total, item) => total + item.quantity, 0))} filtrados</span>
            </div>
            <div className="filters">
              <SelectField
                value={tierFilter}
                onValueChange={(value) => setTierFilter(value as FilterValue<AppTier>)}
                options={["TODOS", ...tiers]}
                labels={{ TODOS: "Todos", ...tierLabels }}
              />
              <SelectField
                value={qualityFilter}
                onValueChange={(value) => setQualityFilter(value as FilterValue<StaffQualityView>)}
                options={["TODOS", ...staffQualities]}
                labels={{ TODOS: "Todas", ...staffQualityLabels }}
              />
            </div>
          </div>
          <StaffStockTable items={filteredLots} />
        </section>

        <section className="staff-market-card staff-market-card--movements">
          <div className="staff-market-card-head">
            <div>
              <h3>Movimientos</h3>
              <span>{formatNumber(movements.length)} registros</span>
            </div>
          </div>
          <StaffMovementTable movements={movements} />
        </section>
      </div>
    </section>
  );
}

function StaffMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="staff-market-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function StaffStockTable({ items }: { items: StaffStockLotView[] }) {
  if (items.length === 0) {
    return <EmptyState text="No hay stock de bastones." />;
  }

  return (
    <div className="staff-market-table staff-market-table--stock">
      <div className="staff-market-row staff-market-row--head">
        <span>Tier</span>
        <span>Calidad</span>
        <span>Cantidad</span>
        <span>Coste</span>
        <span>Ticket</span>
      </div>
      {items.map((item) => (
        <div className="staff-market-row" key={item.id}>
          <TierBadge tier={item.tier} />
          <span>{staffQualityLabels[item.quality]}</span>
          <strong>{formatNumber(item.quantity)}</strong>
          <span>{formatCurrency(item.unitCost)}</span>
          <span>{item.ticketCode}</span>
        </div>
      ))}
    </div>
  );
}

function StaffMovementTable({ movements }: { movements: StaffStockMovementView[] }) {
  if (movements.length === 0) {
    return <EmptyState text="No hay movimientos de bastones." />;
  }

  return (
    <div className="staff-market-table staff-market-table--movements">
      <div className="staff-market-row staff-market-row--head">
        <span>Fecha</span>
        <span>Tipo</span>
        <span>Tier</span>
        <span>Calidad</span>
        <span>Cantidad</span>
        <span>Total</span>
        <span>Motivo</span>
      </div>
      {movements.map((movement) => (
        <div className="staff-market-row" key={movement.id}>
          <span>{formatDate(movement.createdAt)}</span>
          <span>{staffMovementTypeLabels[movement.type]}</span>
          <TierBadge tier={movement.tier} />
          <span>{staffQualityLabels[movement.quality]}</span>
          <strong>{formatNumber(movement.quantity)}</strong>
          <span>{formatCurrency(movement.total)}</span>
          <span>{movement.reason ?? (movement.ticketId ? `Ticket ${movement.ticketId.slice(0, 8)}` : "-")}</span>
        </div>
      ))}
    </div>
  );
}

function SellStaffDialog({ stock }: { stock: StaffStockItemView[] }) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [quality, setQuality] = useState<StaffQualityView>("NORMAL");
  const [quantity, setQuantity] = useState("");
  const [total, setTotal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sellStaffStock = useStaffStockStore((state) => state.sellStaffStock);
  const available = stock.find((item) => item.tier === tier && item.quality === quality)?.quantity ?? 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await sellStaffStock({ tier, quality, quantity: parseThousands(quantity), total: parseThousands(total) });
      setQuantity("");
      setTotal("");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo registrar la venta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button primary">
          <CircleDollarSign />
          Registrar venta
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Venta de bastones</Dialog.Title>
          <Dialog.Description className="modal-copy">Disponible: {formatNumber(available)}</Dialog.Description>
          <form className="form" onSubmit={submit}>
            <SelectField label="Tier" value={tier} onValueChange={(value) => setTier(value as AppTier)} options={tiers} labels={tierLabels} />
            <SelectField label="Calidad" value={quality} onValueChange={(value) => setQuality(value as StaffQualityView)} options={staffQualities} labels={staffQualityLabels} />
            <label className="field">
              Cantidad
              <input value={quantity} onChange={(event) => setQuantity(normalizeThousandsInput(event.target.value))} type="text" inputMode="numeric" pattern="[0-9.]*" />
            </label>
            <label className="field">
              Total venta
              <input value={total} onChange={(event) => setTotal(normalizeThousandsInput(event.target.value))} type="text" inputMode="numeric" pattern="[0-9.]*" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">Cancelar</button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <CircleDollarSign />}
                Vender
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar"><X /></button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AdjustStaffDialog() {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<AppTier>("T5");
  const [quality, setQuality] = useState<StaffQualityView>("NORMAL");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const adjustStaffStock = useStaffStockStore((state) => state.adjustStaffStock);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adjustStaffStock({ tier, quality, quantity: Number(quantity), reason });
      setQuantity("1");
      setReason("");
      setOpen(false);
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "No se pudo ajustar el stock.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button">
          <SlidersHorizontal />
          Ajustar stock
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>Ajuste de bastones</Dialog.Title>
          <Dialog.Description className="sr-only">Suma o resta bastones del stock con motivo.</Dialog.Description>
          <form className="form" onSubmit={submit}>
            <SelectField label="Tier" value={tier} onValueChange={(value) => setTier(value as AppTier)} options={tiers} labels={tierLabels} />
            <SelectField label="Calidad" value={quality} onValueChange={(value) => setQuality(value as StaffQualityView)} options={staffQualities} labels={staffQualityLabels} />
            <label className="field">
              Cantidad (+/-)
              <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" step="1" />
            </label>
            <label className="field">
              Motivo
              <input value={reason} onChange={(event) => setReason(event.target.value)} type="text" />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">Cancelar</button>
              </Dialog.Close>
              <button className="button primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="spin" /> : <Package />}
                Guardar
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar"><X /></button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
