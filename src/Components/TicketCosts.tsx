import {
  BadgeDollarSign,
  BookOpenCheck,
  Calculator,
  CircleDollarSign,
  Hammer,
  Package,
  Recycle,
  WalletCards
} from "lucide-react";
import type { ReactNode } from "react";
import type { FabricationTicketView } from "../../electron/types";
import { formatCurrency } from "../app-data";
import staffMonoIcon from "../Resources/staff-monocolor.svg";

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
  const groups: CostGroup[] = compact
    ? [
        {
          title: "Resumen",
          metrics: [
            { key: "tax", label: "Tax", value: formatCurrency(ticket.tax), icon: <BadgeDollarSign /> },
            { key: "craftingTax", label: "Crafting Tax", value: formatCurrency(ticket.craftingTax), icon: <Hammer /> },
            { key: "staffQuantity", label: "Bastones", value: String(ticket.staffQuantity), icon: staffIcon },
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
      ]
    : [
        {
          title: "Impuestos",
          metrics: [
            { key: "tax", label: "Tax", value: formatCurrency(ticket.tax), icon: <BadgeDollarSign /> },
            { key: "craftingTax", label: "Crafting Tax", value: formatCurrency(ticket.craftingTax), icon: <Hammer /> }
          ]
        },
        {
          title: "Produccion",
          metrics: [
            { key: "staffQuantity", label: "Bastones", value: String(ticket.staffQuantity), icon: staffIcon },
            { key: "materialTotal", label: "Materiales", value: formatCurrency(ticket.materialTotal), icon: <Package /> },
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
            }
          ]
        },
        {
          title: "Sobras",
          metrics: [
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
          ]
        },
        {
          title: "Totales",
          metrics: [
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

  return (
    <div className={compact ? "ticket-costs ticket-costs--compact" : "ticket-costs"}>
      {groups.map((group) => (
        <section className="ticket-costs__group" key={group.title}>
          {!compact ? <h3>{group.title}</h3> : null}
          <div className="ticket-costs__grid">
            {group.metrics.map((metric) => (
              <div className={metric.emphasis ? "ticket-cost ticket-cost--emphasis" : "ticket-cost"} key={metric.key}>
                <span className="ticket-cost__icon">{metric.icon}</span>
                <span className="ticket-cost__label">{metric.label}</span>
                <strong className="ticket-cost__value">{metric.value}</strong>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
