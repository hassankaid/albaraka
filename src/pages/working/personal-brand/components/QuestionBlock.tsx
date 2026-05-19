import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hasDeprecatedValue, DEPRECATED_VALUES, type Question } from "../lib/sections";

interface Props {
  q: Question;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}

export function QuestionBlock({ q, value, onChange }: Props) {
  // Refonte 19/05/2026 : détection des valeurs obsolètes pour migration UX.
  // Si la valeur stockée n'existe plus dans les nouvelles options du quiz,
  // on affiche un bandeau ⚠️ et on invite l'utilisateur à re-choisir.
  const isDeprecated = hasDeprecatedValue(q.id, value);
  const deprecatedSet = DEPRECATED_VALUES[q.id];

  // Pour une question single (select), on garde la valeur si elle est obsolète
  // pour la montrer en lecture seule dans le bandeau ; pour une multi on filtre
  // les valeurs invalides côté affichage des chips (les autres restent valides).
  const deprecatedOldValues: string[] = (() => {
    if (!isDeprecated || !deprecatedSet) return [];
    if (Array.isArray(value)) return value.filter((v) => deprecatedSet.has(v));
    if (typeof value === "string") return deprecatedSet.has(value) ? [value] : [];
    return [];
  })();

  // Pour multi : ne pas considérer les valeurs obsolètes comme sélectionnées
  // (les options affichées n'incluent plus l'ancien libellé donc elles ne
  // matcheraient pas de toute façon, mais on s'en sert pour le bandeau).
  const cleanedMultiValue: string[] = Array.isArray(value)
    ? value.filter((v) => !deprecatedSet?.has(v))
    : [];

  // Pour select : si la valeur courante est obsolète, on l'efface visuellement
  // (aucune option active) tant que l'utilisateur n'a pas re-confirmé.
  const cleanedSelectValue: string = (() => {
    if (typeof value !== "string") return "";
    if (deprecatedSet?.has(value)) return "";
    return value;
  })();

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground leading-relaxed">
        {q.label}
        {isDeprecated && (
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            À mettre à jour
          </span>
        )}
      </label>

      {/* Bandeau migration : la valeur stockée n'existe plus dans les options */}
      {isDeprecated && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[12px] leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 text-foreground/80">
            Cette question a été simplifiée. Tes anciennes valeurs ne sont plus
            proposées :{" "}
            <span className="text-amber-300 font-medium">
              {deprecatedOldValues.map((v) => `« ${v} »`).join(", ")}
            </span>
            . Choisis parmi les nouvelles options ci-dessous pour mettre à jour.
          </div>
        </div>
      )}

      {q.type === "text" && (
        <Input
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
        />
      )}

      {q.type === "textarea" && (
        <Textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={q.placeholder}
          rows={5}
        />
      )}

      {q.type === "select" && (
        <div className="flex flex-col gap-2">
          {q.options?.map((opt) => {
            const active = cleanedSelectValue === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(active ? "" : opt)}
                className={cn(
                  "text-left px-4 py-3 rounded-lg border text-sm transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {active ? "✦ " : ""}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === "multi" && (
        <div className="flex flex-wrap gap-2">
          {q.options?.map((opt) => {
            const active = cleanedMultiValue.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  // On reconstruit toujours depuis la valeur cleaned (sans les
                  // anciennes valeurs obsolètes) pour qu'au prochain save BDD
                  // les obsolètes disparaissent automatiquement.
                  onChange(
                    active
                      ? cleanedMultiValue.filter((x) => x !== opt)
                      : [...cleanedMultiValue, opt]
                  );
                }}
                className={cn(
                  "px-3.5 py-2 rounded-full border text-xs transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                {active ? "✦ " : ""}
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.help && (
        <p className="text-[11px] text-muted-foreground italic leading-relaxed">
          {q.help}
        </p>
      )}
    </div>
  );
}
