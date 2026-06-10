import * as Dialog from "@radix-ui/react-dialog";
import { BadgeDollarSign, Factory, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { FabricationTicketView, RecipeId } from "../../electron/types";
import { defaultRecipeId, formatNumber, getDefaultTicketTax, recipeIds, ticketRecipes, tierLabels, tiers } from "../app-data";
import { formatThousands, normalizeThousandsInput, parseThousands } from "../number-format";
import {
  createDefaultTicketAnalizerHistoryManualState,
  createEmptyTicketAnalizerHistorySummary
} from "../Pages/TicketAnalizer/ticket-analizer";
import { useHistoryStore } from "../stores/history-store";
import { TicketDialogForm } from "./TicketDialog";
import "./TicketDialog.scss";

export function TicketDialogXL() {
  const [open, setOpen] = useState(false);
  const [recipeId, setRecipeId] = useState<RecipeId>(defaultRecipeId);
  const [tax, setTax] = useState("");
  const [stepIndex, setStepIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [createdTickets, setCreatedTickets] = useState<FabricationTicketView[]>([]);
  const [setupError, setSetupError] = useState<string | null>(null);
  const closedTickets = useHistoryStore((state) => state.tickets);
  const defaultTax = useMemo(() => getDefaultTicketTax(closedTickets), [closedTickets]);
  const effectiveTax = tax === "" ? defaultTax : parseThousands(tax);
  const currentTier = tiers[stepIndex];
  const isLastStep = stepIndex === tiers.length - 1;

  const reset = () => {
    setStarted(false);
    setStepIndex(0);
    setTax("");
    setRecipeId(defaultRecipeId);
    setCreatedTickets([]);
    setSetupError(null);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSetupError(null);
    if (effectiveTax < 1 || effectiveTax > 1000) {
      setSetupError("Tax debe estar entre 1 y 1000.");
      return;
    }

    setStarted(true);
    setStepIndex(0);
    setCreatedTickets([]);
  };

  const finishTicketXl = async (ticket: FabricationTicketView) => {
    const nextCreatedTickets = [...createdTickets, ticket];
    if (nextCreatedTickets.length !== tiers.length) {
      setCreatedTickets(nextCreatedTickets);
      setStepIndex((current) => current + 1);
      return;
    }

    try {
      await window.blight.saveTicketAnalizerHistory({
        ticketIds: nextCreatedTickets.map((createdTicket) => createdTicket.id),
        manualState: createDefaultTicketAnalizerHistoryManualState(),
        summary: createEmptyTicketAnalizerHistorySummary()
      });
      close();
    } catch (currentError) {
      setCreatedTickets(nextCreatedTickets);
      setSetupError(currentError instanceof Error ? currentError.message : "No se pudo guardar HistoryXL.");
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          reset();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="ticket-dialog__trigger" type="button">
          <Factory />
          TicketXL
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="ticket-dialog__overlay" />
        <Dialog.Content className="ticket-dialog">
          {!started ? (
            <form className="ticket-dialog__form" onSubmit={start}>
              <section className="ticket-dialog__section">
                <div className="ticket-dialog__section-head">
                  <strong>TicketXL</strong>
                  <span>4 tickets: T5, T6, T7 y T8</span>
                </div>
                <p className="ticket-dialog__copy">
                  Selecciona una receta y un tax global. Estos valores se aplicaran a todo el flujo.
                </p>
              </section>
              <section className="ticket-dialog__section">
                <div className="ticket-dialog__section-head">
                  <strong>Receta</strong>
                  <span>Seleccion activa: {ticketRecipes[recipeId].label}</span>
                </div>
                <div className="ticket-dialog__recipe-grid">
                  {recipeIds.map((currentRecipeId) => {
                    const recipe = ticketRecipes[currentRecipeId];
                    const summary = `${recipe.materials[0].quantity} tablas, ${recipe.materials[1].quantity} telas, ${recipe.materials[2].quantity} artefactos`;

                    return (
                      <button
                        aria-pressed={recipeId === currentRecipeId}
                        className="ticket-recipe-option"
                        key={currentRecipeId}
                        onClick={() => setRecipeId(currentRecipeId)}
                        type="button"
                      >
                        <strong>{recipe.label}</strong>
                        <span>{summary}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
              <div className="ticket-dialog__inputs">
                <label className="ticket-dialog__field">
                  <span>
                    <BadgeDollarSign />
                    Tax
                  </span>
                  <input
                    value={tax}
                    onChange={(event) => setTax(normalizeThousandsInput(event.target.value))}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9.]*"
                    placeholder={formatThousands(String(defaultTax))}
                    aria-label={`Tax, por defecto ${formatNumber(defaultTax)}`}
                  />
                </label>
              </div>
              {setupError ? <p className="ticket-dialog__error">{setupError}</p> : null}
              <div className="ticket-dialog__actions">
                <button className="ticket-dialog__button ticket-dialog__button--ghost" type="button" onClick={close}>
                  Cancelar
                </button>
                <button className="ticket-dialog__button ticket-dialog__button--primary" type="submit">
                  <Factory />
                  Iniciar TicketXL
                </button>
              </div>
            </form>
          ) : setupError && createdTickets.length === tiers.length ? (
            <div className="ticket-dialog__form">
              <section className="ticket-dialog__section">
                <div className="ticket-dialog__section-head">
                  <strong>TicketXL creado</strong>
                  <span>HistoryXL pendiente</span>
                </div>
                <p className="ticket-dialog__copy">
                  Los 4 tickets XL fueron creados, pero no se pudo guardar el snapshot automatico.
                </p>
              </section>
              <p className="ticket-dialog__error">{setupError}</p>
              <div className="ticket-dialog__actions">
                <button className="ticket-dialog__button ticket-dialog__button--primary" type="button" onClick={close}>
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <>
              {setupError ? <p className="ticket-dialog__error">{setupError}</p> : null}
              <TicketDialogForm
                active={open}
                fixedRecipeId={recipeId}
                fixedTax={effectiveTax}
                fixedTier={currentTier}
                idPrefix="XL"
                onCancel={close}
                onCreated={(ticket) => finishTicketXl(ticket)}
                stepLabel={`TicketXL ${stepIndex + 1}/${tiers.length}: ${tierLabels[currentTier]}`}
                submitLabel={isLastStep ? "Crear y finalizar" : "Crear y continuar"}
              />
            </>
          )}
          <Dialog.Close asChild>
            <button className="ticket-dialog__close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
