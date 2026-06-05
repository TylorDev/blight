import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { AppTier, FabricationTicketView } from "../electron/types";
import { formatCurrency, recipeDiary } from "./app-data";

export function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  options,
  labels
}: {
  label?: string;
  value: T;
  onValueChange: (value: string) => void;
  options: T[];
  labels: Record<string, string>;
}) {
  return (
    <label className="field compact">
      {label ? <span>{label}</span> : null}
      <Select.Root value={value} onValueChange={onValueChange}>
        <Select.Trigger className="select">
          <Select.Value />
          <Select.Icon>
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item className="select-item" key={option} value={option}>
                  <Select.ItemText>{labels[option]}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

export function TierBadge({ tier }: { tier: AppTier }) {
  return <span className={`tier-badge tier-badge--${tier.toLowerCase()}`}>{tier}</span>;
}

export function Recipe({ tier }: { tier: AppTier }) {
  return (
    <div className="recipe">
      <span>73 Tablas</span>
      <span>44 Telas</span>
      <span>6 Artefactos</span>
      <span>{recipeDiary[tier]} Diarios</span>
    </div>
  );
}

export function TicketCosts({ ticket, compact = false }: { ticket: FabricationTicketView; compact?: boolean }) {
  return (
    <div className={compact ? "cost-grid compact" : "cost-grid"}>
      <span>Tax {formatCurrency(ticket.tax)}</span>
      <span>Crafting Tax {formatCurrency(ticket.craftingTax)}</span>
      <span>Bastones {ticket.staffQuantity}</span>
      {!compact ? <span>Materiales {formatCurrency(ticket.materialTotal)}</span> : null}
      {!compact ? <span>Diarios llenos {ticket.filledDiariesQuantity}</span> : null}
      {!compact ? <span>Descuento diarios {formatCurrency(ticket.filledDiariesDiscount)}</span> : null}
      {!compact ? <span>Sobras tablas {ticket.leftoverTablesQuantity} - {formatCurrency(ticket.leftoverTablesValue)}</span> : null}
      {!compact ? <span>Sobras telas {ticket.leftoverClothsQuantity} - {formatCurrency(ticket.leftoverClothsValue)}</span> : null}
      {!compact ? <span>Descuento sobras {formatCurrency(ticket.appliedLeftoverDiscount)}</span> : null}
      {!compact ? <span>Inversion Total {formatCurrency(ticket.investmentTotal)}</span> : null}
      {!compact ? <span>Precio de cada baston {formatCurrency(ticket.unitCost)}</span> : null}
    </div>
  );
}

export function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}
