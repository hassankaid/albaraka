import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntityOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface Props {
  label: string;
  placeholder?: string;
  options: EntityOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  loading?: boolean;
}

export default function EntitySearchSelect({ label, placeholder, options, value, onChange, loading }: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return options.slice(0, 20);
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q)).slice(0, 20);
  }, [options, search]);

  const selected = options.find((o) => o.id === value);

  if (value && selected) {
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-muted/30">
          <span className="text-sm flex-1">{selected.label} {selected.sublabel && <span className="text-muted-foreground">— {selected.sublabel}</span>}</span>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="h-6 w-6 p-0"><X className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 relative">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder || "Rechercher…"}
          className="pl-9"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {loading && <div className="p-2 text-sm text-muted-foreground">Chargement…</div>}
          {!loading && filtered.length === 0 && <div className="p-2 text-sm text-muted-foreground">Aucun résultat</div>}
          {filtered.map((o) => (
            <button
              key={o.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              onClick={() => { onChange(o.id); setSearch(""); setOpen(false); }}
            >
              {o.label}
              {o.sublabel && <span className="text-muted-foreground ml-2 text-xs">{o.sublabel}</span>}
            </button>
          ))}
        </div>
      )}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
