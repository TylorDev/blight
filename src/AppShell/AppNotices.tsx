import "./AppNotices.scss";

export function AppNotices({
  errors,
  missingMaterials
}: {
  errors: Array<string | null>;
  missingMaterials: string[];
}) {
  if (errors.length === 0 && missingMaterials.length === 0) {
    return null;
  }

  return (
    <div className="app-notices">
      {errors.map((error) => (
        <div className="notice danger" key={error}>
          {error}
        </div>
      ))}
      {missingMaterials.length > 0 ? (
        <div className="notice danger">
          Faltan materiales: {missingMaterials.join(", ")}
        </div>
      ) : null}
    </div>
  );
}
