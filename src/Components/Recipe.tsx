import type { AppTier, LeftoverCreditView } from "../../electron/types";
import { categoryLabels, getEffectiveRecipeMaterials } from "../app-data";

export function Recipe({ tier, leftoverCredits = [] }: { tier: AppTier; leftoverCredits?: LeftoverCreditView[] }) {
  return (
    <div className="recipe">
      {getEffectiveRecipeMaterials(tier, leftoverCredits).map((material) => (
        <span key={material.category}>
          {material.quantity} {categoryLabels[material.category]}
        </span>
      ))}
    </div>
  );
}
