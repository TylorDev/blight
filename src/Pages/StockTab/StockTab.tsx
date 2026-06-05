import { useMemo } from "react";
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
import { EmptyState, SelectField, TierBadge } from "../../Components";
import { useStockStore } from "../../stores/stock-store";
import "./StockTab.scss";

export function StockTab() {
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
      {filteredStock.length > 0 ? (
        <StockTable items={filteredStock} />
      ) : (
        <div className="stock-table stock-table--empty">
          <EmptyState text="No hay stock disponible." />
        </div>
      )}
    </>
  );
}

function StockTable({ items }: { items: StockItemView[] }) {
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
        <div className="stock-row" key={item.id}>
          <span>{categoryLabels[item.category]}</span>
          <TierBadge tier={item.tier} />
          <span>{formatNumber(item.quantity)}</span>
          <span>{formatCurrency(item.total)}</span>
          <span>{formatCurrency(item.averageCost)}</span>
        </div>
      ))}
    </div>
  );
}
