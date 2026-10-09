// Couleur au choix : les 10 teintes proposées, ou une couleur libre.
import { cn } from "@/lib/utils";
import { PALETTE } from "@/lib/studio/reglages";

export function SelecteurCouleur({
  label,
  valeur,
  onChange,
}: {
  label: string;
  valeur: string;
  onChange: (hex: string) => void;
}) {
  const libre = !PALETTE.some((c) => c.hex.toLowerCase() === valeur.toLowerCase());
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.nom}
            aria-label={`${label} : ${c.nom}`}
            aria-pressed={c.hex.toLowerCase() === valeur.toLowerCase()}
            onClick={() => onChange(c.hex)}
            className={cn(
              "h-8 w-8 rounded-full border border-border transition-transform hover:scale-110",
              c.hex.toLowerCase() === valeur.toLowerCase() && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: c.hex }}
          />
        ))}
        <label
          className={cn(
            "relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-border px-2.5 text-xs text-muted-foreground hover:text-foreground",
            libre && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          title="Couleur libre"
        >
          <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: valeur }} />
          Libre
          <input
            type="color"
            value={valeur}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={`${label} : couleur libre`}
          />
        </label>
      </div>
    </div>
  );
}
