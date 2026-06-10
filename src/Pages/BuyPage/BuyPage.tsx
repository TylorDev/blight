import * as Dialog from "@radix-ui/react-dialog";
import { CircleDollarSign, X } from "lucide-react";
import type { PurchaseInvoiceView } from "../../../electron/types";
import {
  categoryLabels,
  formatCurrency,
  formatDate,
  formatNumber,
  purchaseVendorLabels
} from "../../app-data";
import { usePurchaseStore } from "../../stores/purchase-store";
import "./BuyPage.scss";

export function BuyPage() {
  const invoices = usePurchaseStore((state) => state.invoices);
  const invoiceTotalInvestment = invoices.reduce((total, invoice) => total + invoice.total, 0);

  return (
    <div className="buy-page">
      <section className="buy-summary" aria-label="Resumen de compras">
        <article className="buy-summary__item">
          <span className="buy-summary__icon">
            <CircleDollarSign />
          </span>
          <span className="buy-summary__label">Total invertido</span>
          <strong className="buy-summary__value">{formatCurrency(invoiceTotalInvestment)}</strong>
          <small>{formatNumber(invoices.length)} facturas</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Facturas</h2>
            <span>{formatNumber(invoices.length)} compras registradas</span>
          </div>
        </div>
        <div className="invoice-list">
          {invoices.length === 0 ? (
            <div className="empty">No hay facturas registradas.</div>
          ) : (
            invoices.map((invoice) => <InvoiceDialog invoice={invoice} key={invoice.id} />)
          )}
        </div>
      </section>
    </div>
  );
}

function InvoiceDialog({ invoice }: { invoice: PurchaseInvoiceView }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="invoice-item" type="button">
          <div>
            <strong>Factura {invoice.number}</strong>
            <span>
              {formatDate(invoice.createdAt)} · {invoiceTypeLabels[invoice.type]} · {purchaseVendorLabels[invoice.vendor]}
            </span>
          </div>
          <b>{formatCurrency(invoice.total)}</b>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="modal invoice-modal">
          <div className="invoice-document">
            <Dialog.Title>Factura {invoice.number}</Dialog.Title>
            <Dialog.Description className="sr-only">
              Detalles de la factura de compra.
            </Dialog.Description>

            <div className="invoice-meta">
              <span>
                <strong>Fecha:</strong> {formatDate(invoice.createdAt)}
              </span>
              <span>
                <strong>Cliente:</strong> {invoice.client}
              </span>
              <span>
                <strong>Vendedor:</strong> {purchaseVendorLabels[invoice.vendor]}
              </span>
            </div>

            <div className="invoice-products">
              <h3>Productos:</h3>
              {invoice.lines.map((line) => (
                <div className="invoice-product" key={line.id}>
                  <span>
                    {categoryLabels[line.category]} {line.tier}
                  </span>
                  <span>{formatNumber(line.quantity)}</span>
                  <span>{formatCurrency(line.total)}</span>
                  <small>{formatDate(line.createdAt)}</small>
                </div>
              ))}
            </div>

            <div className="invoice-totals">
              <span>
                <strong>Subtotal:</strong> {formatCurrency(invoice.total)}
              </span>
              <span>
                <strong>Estado:</strong> Pagada
              </span>
              <span>
                <strong>Tipo:</strong> {invoiceTypeLabels[invoice.type]}
              </span>
            </div>
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

const invoiceTypeLabels = {
  UNICA: "Unica",
  MASIVA: "Masiva"
} as const;
