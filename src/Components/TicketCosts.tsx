import {
  BadgeDollarSign,
  BookOpenCheck,
  Calculator,
  CircleDollarSign,
  Gauge,
  Hammer,
  Package,
  Recycle,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import type { FabricationTicketView } from "../../electron/types";
import { formatCurrency } from "../app-data";
import staffMonoIcon from "../Resources/staff-monocolor.svg";
import "./TicketCosts.scss";

type CostMetric = {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  emphasis?: boolean;
};

type CostGroup = {
  title: string;
  metrics: CostMetric[];
};

export function TicketCosts({ ticket, compact = false }: { ticket: FabricationTicketView; compact?: boolean }) {
  const staffIcon = <img src={staffMonoIcon} alt="" />;
  const compactGroups: CostGroup[] = [
    {
      title: "Resumen",
      metrics: [
        { key: "tax", label: "Tax", value: formatCurrency(ticket.tax), icon: <BadgeDollarSign /> },
        { key: "craftingTax", label: "Crafting Tax", value: formatCurrency(ticket.craftingTax), icon: <Hammer /> },
        { key: "staffQuantity", label: "Bastones", value: String(ticket.staffQuantity), icon: staffIcon },
        { key: "focusCost", label: "Foco", value: formatCurrency(ticket.focusCost), icon: <Gauge /> },
        {
          key: "investmentTotal",
          label: "Inversion Total",
          value: formatCurrency(ticket.investmentTotal),
          icon: <WalletCards />,
          emphasis: true
        },
        {
          key: "unitCost",
          label: "Precio de cada baston",
          value: formatCurrency(ticket.unitCost),
          icon: <Calculator />,
          emphasis: true
        }
      ]
    }
  ];
  const heroMetrics: CostMetric[] = [
    {
      key: "investmentTotal",
      label: "Inversion Total",
      value: formatCurrency(ticket.investmentTotal),
      icon: <WalletCards />,
      emphasis: true
    },
    {
      key: "unitCost",
      label: "Precio de cada baston",
      value: formatCurrency(ticket.unitCost),
      icon: <Calculator />,
      emphasis: true
    },
    { key: "staffQuantity", label: "Bastones", value: String(ticket.staffQuantity), icon: staffIcon, emphasis: true },
    { key: "materialTotal", label: "Materiales", value: formatCurrency(ticket.materialTotal), icon: <Package /> }
  ];
  const detailMetrics: CostMetric[] = [
    { key: "tax", label: "Tax", value: formatCurrency(ticket.tax), icon: <BadgeDollarSign /> },
    { key: "craftingTax", label: "Crafting Tax", value: formatCurrency(ticket.craftingTax), icon: <Hammer /> },
    { key: "focusCost", label: "Foco", value: formatCurrency(ticket.focusCost), icon: <Gauge /> },
    {
      key: "filledDiariesQuantity",
      label: "Diarios llenos",
      value: String(ticket.filledDiariesQuantity),
      icon: <BookOpenCheck />
    },
    {
      key: "filledDiariesDiscount",
      label: "Descuento diarios",
      value: formatCurrency(ticket.filledDiariesDiscount),
      icon: <CircleDollarSign />
    },
    {
      key: "leftoverTables",
      label: "Sobras tablas",
      value: `${ticket.leftoverTablesQuantity} - ${formatCurrency(ticket.leftoverTablesValue)}`,
      icon: <Recycle />
    },
    {
      key: "leftoverCloths",
      label: "Sobras telas",
      value: `${ticket.leftoverClothsQuantity} - ${formatCurrency(ticket.leftoverClothsValue)}`,
      icon: <Recycle />
    },
    {
      key: "appliedLeftoverDiscount",
      label: "Sobras aplicadas",
      value: formatCurrency(ticket.appliedLeftoverDiscount),
      icon: <CircleDollarSign />
    }
  ];

  if (!compact) {
    return (
      <div className="ticket-costs ticket-costs--detail">
        <section className="ticket-costs__hero" aria-label="Resumen principal de costos">
          {heroMetrics.map((metric) => (
            <CostMetricCard metric={metric} key={metric.key} />
          ))}
        </section>
        <section className="ticket-costs__details" aria-label="Detalle de costos">
          {detailMetrics.map((metric) => (
            <CostMetricCard metric={metric} key={metric.key} />
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="ticket-costs ticket-costs--compact">
      {compactGroups.map((group) => (
        <section className="ticket-costs__group" key={group.title}>
          <div className="ticket-costs__grid">
            {group.metrics.map((metric) => (
              <CostMetricCard metric={metric} key={metric.key} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CostMetricCard({ metric }: { metric: CostMetric }) {
  return (
    <div className={metric.emphasis ? "ticket-cost ticket-cost--emphasis" : "ticket-cost"}>
      <span className="ticket-cost__icon">{metric.icon}</span>
      <span className="ticket-cost__label">{metric.label}</span>
      <strong className="ticket-cost__value">{metric.value}</strong>
    </div>
  );
}
