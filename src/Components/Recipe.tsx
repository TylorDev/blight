import type { AppTier, LeftoverCreditView, RecipeId } from "../../electron/types";
import { categoryLabels, getEffectiveRecipeMaterials } from "../app-data";

export function Recipe({
  className = "recipe",
  tier,
  recipeId,
  leftoverCredits = []
}: {
  className?: string;
  tier: AppTier;
  recipeId?: RecipeId;
  leftoverCredits?: LeftoverCreditView[];
}) {
  return (
    <div className={className}>
      {getEffectiveRecipeMaterials(tier, recipeId, leftoverCredits).map((material) => (
        <span key={material.category}>
          {material.quantity} {categoryLabels[material.category]}
        </span>
      ))}
    </div>
  );
}
