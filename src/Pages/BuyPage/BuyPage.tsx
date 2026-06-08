import { CircleDollarSign, ReceiptText } from "lucide-react";
import { Metric } from "../../Components";
import { categories, categoryLabels, formatCurrency, formatNumber } from "../../app-data";
import { useStockStore } from "../../stores/stock-store";
import "./BuyPage.scss";

export function BuyPage() {
  const stock = useStockStore((state) => state.stock);
  const totalInvestment = stock.reduce((total, item) => total + item.total, 0);
  const categorySummaries = categories.map((category) => {
    const items = stock.filter((item) => item.category === category);
    return {
      category,
      quantity: items.reduce((total, item) => total + item.quantity, 0),
      total: items.reduce((total, item) => total + item.total, 0)
    };
  });
  const visibleStock = stock.filter((item) => item.quantity > 0 || item.total > 0);

  return (
    <div className="buy-page">
      <section className="buy-summary">
        <Metric icon={<CircleDollarSign />} label="Dinero invertido" value={formatCurrency(totalInvestment)} />
        {categorySummaries.map((summary) => (
          <Metric
            icon={<ReceiptText />}
            key={summary.category}
            label={`${categoryLabels[summary.category]} comprados`}
            value={formatNumber(summary.quantity)}
          />
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Total por material</h2>
            <span>Resumen agregado desde el stock actual</span>
          </div>
        </div>
        <div className="buy-table">
          <div className="buy-row buy-row--head">
            <span>Material</span>
            <span>Cantidad total</span>
            <span>Dinero invertido</span>
          </div>
          {categorySummaries.map((summary) => (
            <div className="buy-row" key={summary.category}>
              <span>{categoryLabels[summary.category]}</span>
              <span>{formatNumber(summary.quantity)}</span>
              <span>{formatCurrency(summary.total)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Detalle agregado</h2>
            <span>Materiales por tier</span>
          </div>
        </div>
        <div className="buy-table">
          <div className="buy-row buy-row--head buy-row--detail">
            <span>Material</span>
            <span>Tier</span>
            <span>Cantidad</span>
            <span>Total</span>
            <span>Precio medio</span>
          </div>
          {visibleStock.map((item) => (
            <div className="buy-row buy-row--detail" key={item.id}>
              <span>{categoryLabels[item.category]}</span>
              <span>{item.tier}</span>
              <span>{formatNumber(item.quantity)}</span>
              <span>{formatCurrency(item.total)}</span>
              <span>{formatCurrency(item.averageCost)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="notice buy-placeholder">
        <strong>Detalles de compras pendientes</strong>
        <span>
          El historial individual de cada compra requiere exponer movimientos de stock desde el proceso principal. Esta
          vista deja el espacio listo sin modificar Electron, preload, Prisma ni el schema de datos.
        </span>
      </section>
    </div>
  );
}
