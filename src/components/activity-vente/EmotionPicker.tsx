import { EMOTION_GROUPS, EMOTIONS_BY_ID } from "@/lib/closing/emotions";
import { cn } from "@/lib/utils";

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
}

export function EmotionPicker({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((e) => e !== id));
    else onChange([...selected, id]);
  };

  return (
    <div className="space-y-3">
      {EMOTION_GROUPS.map((g) => (
        <div key={g.label}>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.ids.map((id) => {
              const em = EMOTIONS_BY_ID.get(id);
              if (!em) return null;
              const active = selected.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition min-h-[32px]",
                    active
                      ? "border-transparent text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/40",
                  )}
                  style={
                    active
                      ? { backgroundColor: `${em.color}22`, borderColor: em.color, color: em.color }
                      : undefined
                  }
                >
                  <span>{em.emoji}</span>
                  <span>{em.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmotionBadges({ ids }: { ids: string[] }) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {ids.slice(0, 3).map((id) => {
        const em = EMOTIONS_BY_ID.get(id);
        return em ? (
          <span key={id} title={em.label} className="text-sm leading-none">
            {em.emoji}
          </span>
        ) : null;
      })}
      {ids.length > 3 && (
        <span className="text-[10px] text-muted-foreground">+{ids.length - 3}</span>
      )}
    </span>
  );
}
