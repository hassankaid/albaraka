// Barre de proportion, posée sous le libellé d'un segment.
//
// Un tableau de chiffres se lit ligne par ligne ; une barre se lit d'un coup.
// C'est le seul ajout purement visuel de cet écran, et il porte une information
// vraie : la part du segment dans le total. Pas de décor.
export default function BarrePart({
  valeur, total, ton = "neutre",
}: {
  valeur: number;
  total: number;
  ton?: "or" | "neutre" | "sourdine";
}) {
  const part = total > 0 ? Math.max(0, Math.min(100, (valeur / total) * 100)) : 0;
  const fond =
    ton === "or" ? "bg-primary"
    : ton === "sourdine" ? "bg-muted-foreground/30"
    : "bg-foreground/25";

  return (
    <div
      className="h-1 w-full rounded-full bg-muted mt-1.5 overflow-hidden"
      role="img"
      aria-label={`${Math.round(part)} % du total`}
    >
      <div className={`h-full rounded-full ${fond}`} style={{ width: `${part}%` }} />
    </div>
  );
}
