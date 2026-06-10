import * as Dialog from "@radix-ui/react-dialog";
import { Check, Loader2, X } from "lucide-react";
import { CSSProperties, FormEvent, useMemo, useState } from "react";
import type { CloseTicketResult, FabricationTicketView, StaffQualityView } from "../../electron/types";
import {
  categoryLabels,
  formatNumber,
  getDefaultFilledDiariesDiscount,
  getDefaultFilledDiariesQuantity,
  getRecentLeftoverQuantitySuggestions,
  staffQualities,
  staffQualityLabels
} from "../app-data";
import { normalizeThousandsInput, parseThousands } from "../number-format";
import { useHistoryStore } from "../stores/history-store";
import { useStaffStockStore } from "../stores/staff-stock-store";
import { useStockStore } from "../stores/stock-store";
import { useTicketStore } from "../stores/ticket-store";
import "./CloseTicketDialog.scss";

const staffQualityTones: Record<StaffQualityView, { color: string; ink: string }> = {
  NORMAL: { color: "#6b7280", ink: "#e5e7eb" },
  BUENA: { color: "#475569", ink: "#dbeafe" },
  NOTABLE: { color: "#b07a3f", ink: "#f5d0a2" },
  SOBRESALIENTE: { color: "#e5e7eb", ink: "#ffffff" },
  OBRA_MAESTRA: { color: "#d6b446", ink: "#fde68a" }
};

export function CloseTicketDialog({ ticket }: { ticket: FabricationTicketView }) {
  const [open, setOpen] = useState(false);
  const [filledDiariesQuantity, setFilledDiariesQuantity] = useState("");
  const [filledDiariesDiscount, setFilledDiariesDiscount] = useState("");
  const [leftoverTablesQuantity, setLeftoverTablesQuantity] = useState("");
  const [leftoverClothsQuantity, setLeftoverClothsQuantity] = useState("");
  const [producedStaffs, setProducedStaffs] = useState<Record<string, string>>(() =>
    getDefaultProducedStaffs(ticket.staffQuantity)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeTicket = useTicketStore((state) => state.closeTicket);
  const clearTicketError = useTicketStore((state) => state.clearError);
  const setMissingMaterials = useTicketStore((state) => state.setMissingMaterials);
  const loadStock = useStockStore((state) => state.loadStock);
  const loadStaffStock = useStaffStockStore((state) => state.loadStaffStock);
  const loadStaffStockLots = useStaffStockStore((state) => state.loadStaffStockLots);
  const loadStaffMovements = useStaffStockStore((state) => state.loadStaffMovements);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const loadHistory = useHistoryStore((state) => state.loadHistory);
  const defaultFilledDiariesQuantity = getDefaultFilledDiariesQuantity(ticket.tier, ticket.recipeId);
  const defaultFilledDiariesDiscount = useMemo(
    () => getDefaultFilledDiariesDiscount(closedTickets, ticket.tier),
    [closedTickets, ticket.tier]
  );
  const tableSuggestions = useMemo(
    () => getRecentLeftoverQuantitySuggestions(closedTickets, ticket.tier, "TABLAS"),
    [closedTickets, ticket.tier]
  );
  const clothSuggestions = useMemo(
    () => getRecentLeftoverQuantitySuggestions(closedTickets, ticket.tier, "TELAS"),
    [closedTickets, ticket.tier]
  );
  const defaultLeftoverTablesQuantity = tableSuggestions[0] ?? 0;
  const defaultLeftoverClothsQuantity = clothSuggestions[0] ?? 0;
  const tableSuggestionsId = `leftover-tables-${ticket.id}`;
  const clothSuggestionsId = `leftover-cloths-${ticket.id}`;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    clearTicketError();
    setMissingMaterials([]);

    const parsedLeftoverTablesQuantity =
      leftoverTablesQuantity === "" ? defaultLeftoverTablesQuantity : parseThousands(leftoverTablesQuantity);
    const parsedLeftoverClothsQuantity =
      leftoverClothsQuantity === "" ? defaultLeftoverClothsQuantity : parseThousands(leftoverClothsQuantity);
    if (parsedLeftoverTablesQuantity < 1 || parsedLeftoverClothsQuantity < 1) {
      setError("Cantidad de Tablas Sobrantes y Cantidad de Telas Sobrantes deben ser mayores a cero.");
      return;
    }
    const parsedProducedStaffs = staffQualities.map((quality) => ({
      quality,
      quantity: parseThousands(producedStaffs[quality] ?? "")
    }));
    const producedStaffTotal = parsedProducedStaffs.reduce((total, staff) => total + staff.quantity, 0);
    if (producedStaffTotal !== ticket.staffQuantity) {
      setError(`La suma de bastones creados debe ser ${ticket.staffQuantity}.`);
      return;
    }

    setSaving(true);

    try {
      const result = await closeTicket({
        ticketId: ticket.id,
        filledDiariesQuantity:
          filledDiariesQuantity === "" ? defaultFilledDiariesQuantity : parseThousands(filledDiariesQuantity),
        filledDiariesDiscount:
          filledDiariesDiscount === "" ? defaultFilledDiariesDiscount : parseThousands(filledDiariesDiscount),
        leftoverTablesQuantity: parsedLeftoverTablesQuantity,
        leftoverClothsQuantity: parsedLeftoverClothsQuantity,
        producedStaffs: parsedProducedStaffs
      });

      if (!result.ok) {
        setError(formatMissingMaterialsError(result.missing));
        return;
      }

      await Promise.all([loadStock(), loadHistory(), loadStaffStock(), loadStaffStockLots(), loadStaffMovements()]);
      setOpen(false);
      setFilledDiariesQuantity("");
      setFilledDiariesDiscount("");
      setLeftoverTablesQuantity("");
      setLeftoverClothsQuantity("");
      setProducedStaffs(getDefaultProducedStaffs(ticket.staffQuantity));
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : "No se pudo cerrar el ticket.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="close-ticket-dialog__trigger" type="button">
          <Check />
          Cerrar
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="close-ticket-dialog__overlay" />
        <Dialog.Content className="close-ticket-dialog">
          <div className="close-ticket-dialog__head">
            <div>
              <Dialog.Title>Cerrar ticket {ticket.tier}</Dialog.Title>
              <p className="close-ticket-dialog__subtitle">
                Registra diarios, sobras y bastones producidos sin modificar los datos base del ticket.
              </p>
            </div>
            <span>{formatNumber(ticket.staffQuantity)} bastones esperados</span>
          </div>
          <Dialog.Description className="close-ticket-dialog__description">
            Cierra el ticket registrando diarios llenos y nuevas sobras para futuros tickets.
          </Dialog.Description>
          <form onSubmit={submit} className="close-ticket-dialog__form">
            <div className="close-ticket-dialog__body">
              <section className="close-ticket-dialog__section">
                <div className="close-ticket-dialog__section-head">
                  <strong>Cierre y sobras</strong>
                  <span>Valores finales del craft</span>
                </div>
                <div className="close-ticket-dialog__field-grid">
                  <label className="close-ticket-dialog__field">
                    <span>Cantidad de diarios llenos</span>
                    <input
                      value={filledDiariesQuantity}
                      onChange={(event) => setFilledDiariesQuantity(normalizeThousandsInput(event.target.value))}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      placeholder={formatNumber(defaultFilledDiariesQuantity)}
                    />
                  </label>
                  <label className="close-ticket-dialog__field">
                    <span>Descuento por diarios llenos</span>
                    <input
                      value={filledDiariesDiscount}
                      onChange={(event) => setFilledDiariesDiscount(normalizeThousandsInput(event.target.value))}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      placeholder={formatNumber(defaultFilledDiariesDiscount)}
                    />
                  </label>
                  <label className="close-ticket-dialog__field">
                    <span>Cantidad de Tablas Sobrantes</span>
                    <input
                      value={leftoverTablesQuantity}
                      onChange={(event) => setLeftoverTablesQuantity(normalizeThousandsInput(event.target.value))}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      list={tableSuggestionsId}
                      placeholder={defaultLeftoverTablesQuantity ? formatNumber(defaultLeftoverTablesQuantity) : ""}
                    />
                    <datalist id={tableSuggestionsId}>
                      {tableSuggestions.map((quantity) => (
                        <option key={quantity} value={formatNumber(quantity)} />
                      ))}
                    </datalist>
                  </label>
                  <label className="close-ticket-dialog__field">
                    <span>Cantidad de Telas Sobrantes</span>
                    <input
                      value={leftoverClothsQuantity}
                      onChange={(event) => setLeftoverClothsQuantity(normalizeThousandsInput(event.target.value))}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9.]*"
                      list={clothSuggestionsId}
                      placeholder={defaultLeftoverClothsQuantity ? formatNumber(defaultLeftoverClothsQuantity) : ""}
                    />
                    <datalist id={clothSuggestionsId}>
                      {clothSuggestions.map((quantity) => (
                        <option key={quantity} value={formatNumber(quantity)} />
                      ))}
                    </datalist>
                  </label>
                </div>
              </section>
              <section className="close-ticket-dialog__section close-ticket-dialog__section--production">
                <div className="close-ticket-dialog__section-head">
                  <strong>Bastones creados</strong>
                  <span>Debe sumar {formatNumber(ticket.staffQuantity)}</span>
                </div>
                <div className="close-ticket-dialog__quality-grid">
                  {staffQualities.map((quality) => {
                    const tone = staffQualityTones[quality];

                    return (
                      <label
                        className="close-ticket-dialog__quality-field"
                        key={quality}
                        style={
                          {
                            "--close-ticket-quality-color": tone.color,
                            "--close-ticket-quality-ink": tone.ink
                          } as CSSProperties
                        }
                      >
                        <span>{staffQualityLabels[quality]}</span>
                        <input
                          value={producedStaffs[quality] ?? ""}
                          onChange={(event) =>
                            setProducedStaffs((current) => ({
                              ...current,
                              [quality]: normalizeThousandsInput(event.target.value)
                            }))
                          }
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9.]*"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            </div>
            {error ? <p className="close-ticket-dialog__error">{error}</p> : null}
            <div className="close-ticket-dialog__actions">
              <Dialog.Close asChild>
                <button className="close-ticket-dialog__button close-ticket-dialog__button--ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="close-ticket-dialog__button close-ticket-dialog__button--primary" type="submit" disabled={saving}>
                {saving ? <Loader2 className="close-ticket-dialog__spin" /> : <Check />}
                Cerrar
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="close-ticket-dialog__close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function getDefaultProducedStaffs(staffQuantity: number) {
  if (staffQuantity === 6) {
    return {
      NORMAL: "0",
      BUENA: "3",
      NOTABLE: "3",
      SOBRESALIENTE: "0",
      OBRA_MAESTRA: "0"
    };
  }

  if (staffQuantity === 7) {
    return {
      NORMAL: "0",
      BUENA: "4",
      NOTABLE: "3",
      SOBRESALIENTE: "0",
      OBRA_MAESTRA: "0"
    };
  }

  return Object.fromEntries(staffQualities.map((quality, index) => [quality, index === 0 ? String(staffQuantity) : ""]));
}

function formatMissingMaterialsError(resultMissing: CloseTicketResult["missing"]) {
  if (!resultMissing || resultMissing.length === 0) {
    return "No se pudo cerrar el ticket. Revisa el stock disponible.";
  }

  const missingMaterials = resultMissing.map(
    (item) => `${categoryLabels[item.category]} ${item.tier} (${formatNumber(item.available)}/${formatNumber(item.required)})`
  );

  return `Faltan materiales: ${missingMaterials.join(", ")}.`;
}
