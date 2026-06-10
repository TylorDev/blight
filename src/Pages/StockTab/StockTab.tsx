import { useMemo, useState } from "react";
import type { AppTier, Category, StockItemView } from "../../../electron/types";
import {
  categories,
  categoryLabels,
  FilterValue,
  formatCurrency,
  formatNumber,
  tierLabels,
  tiers
} from "../../app-data";
import { EmptyState, PurchaseDialog, SelectField, TierBadge } from "../../Components";
import { useStockStore } from "../../stores/stock-store";
import "./StockTab.scss";

export function StockTab() {
  const [purchaseSelection, setPurchaseSelection] =
    useState<Pick<StockItemView, "averageCost" | "category" | "tier"> | null>(null);
  const stock = useStockStore((state) => state.stock);
  const categoryFilter = useStockStore((state) => state.categoryFilter);
  const tierFilter = useStockStore((state) => state.tierFilter);
  const setCategoryFilter = useStockStore((state) => state.setCategoryFilter);
  const setTierFilter = useStockStore((state) => state.setTierFilter);
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const categoryMatches = categoryFilter === "TODOS" || item.category === categoryFilter;
      const tierMatches = tierFilter === "TODOS" || item.tier === tierFilter;
      return item.quantity > 0 && categoryMatches && tierMatches;
    });
  }, [categoryFilter, stock, tierFilter]);
  const stockSummary = useMemo(() => {
    return categories.map((category) => ({
      category,
      total: stock
        .filter((item) => item.category === category)
        .reduce((categoryTotal, item) => categoryTotal + item.total, 0)
    }));
  }, [stock]);
  const tierSummary = useMemo(() => {
    return tiers.map((tier) => ({
      tier,
      total: stock
        .filter((item) => item.tier === tier)
        .reduce((tierTotal, item) => tierTotal + item.total, 0)
    }));
  }, [stock]);

  return (
    <>
      <div className="panel-head">
        <div>
          <h2>Stock</h2>
          <span>{filteredStock.length} items</span>
        </div>
        <div className="filters">
          <SelectField
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value as FilterValue<Category>)}
            options={["TODOS", ...categories]}
            labels={{ TODOS: "Todas", ...categoryLabels }}
          />
          <SelectField
            value={tierFilter}
            onValueChange={(value) => setTierFilter(value as FilterValue<AppTier>)}
            options={["TODOS", ...tiers]}
            labels={{ TODOS: "Todos", ...tierLabels }}
          />
        </div>
      </div>
      <section className="stock-summary" aria-label="Resumen de inversion por material">
        {stockSummary.map((item) => (
          <article className="stock-summary__item" key={item.category}>
            <span className="stock-summary__label">Total Invertido en {categoryLabels[item.category]}</span>
            <strong className="stock-summary__value">{formatCurrency(item.total)}</strong>
          </article>
        ))}
      </section>
      <section className="stock-summary stock-summary--tier" aria-label="Resumen de inversion por tier">
        {tierSummary.map((item) => (
          <article className="stock-summary__item" key={item.tier}>
            <span className="stock-summary__label">Total Invertido en {tierLabels[item.tier]}</span>
            <strong className="stock-summary__value">{formatCurrency(item.total)}</strong>
          </article>
        ))}
      </section>
      {filteredStock.length > 0 ? (
        <StockTable items={filteredStock} onSelectPurchase={setPurchaseSelection} />
      ) : (
        <div className="stock-table stock-table--empty">
          <EmptyState text="No hay stock disponible." />
        </div>
      )}
      <PurchaseDialog
        initialAverageCost={purchaseSelection?.averageCost}
        initialCategory={purchaseSelection?.category}
        initialTier={purchaseSelection?.tier}
        open={Boolean(purchaseSelection)}
        onOpenChange={(open) => {
          if (!open) {
            setPurchaseSelection(null);
          }
        }}
        showTrigger={false}
      />
    </>
  );
}

function StockTable({
  items,
  onSelectPurchase
}: {
  items: StockItemView[];
  onSelectPurchase: (item: Pick<StockItemView, "averageCost" | "category" | "tier">) => void;
}) {
  return (
    <div className="stock-table">
      <div className="stock-row stock-row--head">
        <span>Categoria</span>
        <span>Tier</span>
        <span>Cantidad</span>
        <span>Total</span>
        <span>Precio medio</span>
      </div>
      {items.map((item) => (
        <button
          aria-label={`Registrar compra de ${categoryLabels[item.category]} ${item.tier}`}
          className="stock-row stock-row--button"
          key={item.id}
          onClick={() =>
            onSelectPurchase({ averageCost: item.averageCost, category: item.category, tier: item.tier })
          }
          type="button"
        >
          <span>{categoryLabels[item.category]}</span>
          <TierBadge tier={item.tier} />
          <span>{formatNumber(item.quantity)}</span>
          <span>{formatCurrency(item.total)}</span>
          <span>{formatCurrency(item.averageCost)}</span>
        </button>
      ))}
    </div>
  );
}
