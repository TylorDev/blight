import { BarChart3, CalendarDays, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { FabricationTicketView, TicketAnalizerHistoryView } from "../../../electron/types";
import { formatCurrency, formatNumber } from "../../app-data";
import { analyzeTickets, getTicketAnalizerValuesFromManualState } from "../TicketAnalizer/ticket-analizer";
import "./HistoryXL.scss";

export function HistoryXL() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<TicketAnalizerHistoryView[]>([]);
  const [closedTickets, setClosedTickets] = useState<FabricationTicketView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([window.blight.listTicketAnalizerHistory(), window.blight.listHistory()])
      .then(([items, tickets]) => {
        setRecords(items);
        setClosedTickets(tickets);
        setError(null);
      })
      .catch((currentError) => {
        setError(currentError instanceof Error ? currentError.message : "No se pudo cargar HistoryXL.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="history-xl-empty">Cargando registros XL</div>;
  }

  if (error) {
    return <div className="history-xl-empty history-xl-empty--error">{error}</div>;
  }

  if (records.length === 0) {
    return <div className="history-xl-empty">Todavia no hay cambios XL guardados.</div>;
  }

  const recordsWithSummary = records.map((record) => {
    const liveSummary = getLiveSummary(record, closedTickets);
    return {
      liveSummary,
      record,
      summaryForTotals: liveSummary ?? record.summary
    };
  });
  const historyTotals = recordsWithSummary.reduce(
    (totals, item) => ({
      grossSale: totals.grossSale + item.summaryForTotals.grossSale,
      netProfit: totals.netProfit + item.summaryForTotals.netProfit,
      taxesAndFees: totals.taxesAndFees + item.summaryForTotals.taxesAndFees,
      totalQuantity: totals.totalQuantity + item.summaryForTotals.totalQuantity
    }),
    { grossSale: 0, netProfit: 0, taxesAndFees: 0, totalQuantity: 0 }
  );

  return (
    <>
      <section className="history-xl-summary" aria-label="Resumen total de HistoryXL">
        <article className="history-xl-summary__item">
          <span className="history-xl-summary__label">Ventas brutas totales</span>
          <strong className="history-xl-summary__value">{formatCurrency(historyTotals.grossSale)}</strong>
        </article>
        <article className="history-xl-summary__item history-xl-summary__item--net">
          <span className="history-xl-summary__label">Ganancia neta total</span>
          <strong className="history-xl-summary__value">{formatCurrency(historyTotals.netProfit)}</strong>
        </article>
        <article className="history-xl-summary__item history-xl-summary__item--taxes">
          <span className="history-xl-summary__label">Total Taxes</span>
          <strong className="history-xl-summary__value">{formatCurrency(historyTotals.taxesAndFees)}</strong>
        </article>
        <article className="history-xl-summary__item">
          <span className="history-xl-summary__label">Bastones producidos</span>
          <strong className="history-xl-summary__value">{formatNumber(historyTotals.totalQuantity)}</strong>
        </article>
      </section>
      <section className="history-xl-list">
        {recordsWithSummary.map(({ liveSummary, record }) => {
          return (
            <button
              className="history-xl-record"
              key={record.id}
              onClick={() => navigate(`/TicketAnalizer?historyId=${encodeURIComponent(record.id)}`)}
              type="button"
            >
              <span className="history-xl-record__date">
                <CalendarDays />
                {formatRecordDate(record.createdAt)}
              </span>
              <strong>{record.ticketIds.join(" / ")}</strong>
              <span className="history-xl-record__summary">
                <BarChart3 />
                {liveSummary
                  ? `Ganancia neta ${formatCurrency(liveSummary.netProfit)}`
                  : `Pendiente ${formatCurrency(record.summary.netProfit)}`}
              </span>
              <span>{liveSummary ? `${formatNumber(liveSummary.totalQuantity)} bastones` : "Tickets sin cerrar"}</span>
              <ChevronRight className="history-xl-record__arrow" />
            </button>
          );
        })}
      </section>
    </>
  );
}

function getLiveSummary(record: TicketAnalizerHistoryView, closedTickets: FabricationTicketView[]) {
  const { editOverrides, saleValueByPower, saleValueExceptions, taxPercentages } = getTicketAnalizerValuesFromManualState(
    record.manualState
  );
  const analysis = analyzeTickets(
    closedTickets,
    record.ticketIds,
    saleValueByPower,
    saleValueExceptions,
    editOverrides,
    taxPercentages
  );

  return analysis.errors.length === 0 ? analysis.financialSummary : null;
}

function formatRecordDate(value: string) {
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
