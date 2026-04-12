import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Question } from "../lib/sections";

interface Props {
  q: Question;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}

export function QuestionBlock({ q, value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground leading-relaxed">
        {q.label}
      </label>

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
          rows={3}
        />
      )}

      {q.type === "select" && (
        <div className="flex flex-col gap-2">
          {q.options?.map((opt) => {
            const active = value === opt;
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
            const selected = Array.isArray(value) ? value : [];
            const active = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() =>
                  onChange(active ? selected.filter((x) => x !== opt) : [...selected, opt])
                }
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
