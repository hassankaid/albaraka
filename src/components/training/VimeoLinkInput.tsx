import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function extractVimeoId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m ? m[1] : null;
}

export interface VimeoLinkInputProps {
  label?: string;
  value: string;
  onChange: (next: { raw: string; vimeoId: string | null; url: string | null }) => void;
  placeholder?: string;
  required?: boolean;
}

export function VimeoLinkInput({
  label = "Lien Vimeo",
  value,
  onChange,
  placeholder = "https://vimeo.com/123456789 ou 123456789",
  required,
}: VimeoLinkInputProps) {
  const [local, setLocal] = useState(value || "");
  const [title, setTitle] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setLocal(value || "");
  }, [value]);

  const vimeoId = useMemo(() => extractVimeoId(local), [local]);
  const normalizedUrl = vimeoId ? `https://vimeo.com/${vimeoId}` : null;

  // Emit change to parent
  useEffect(() => {
    onChange({ raw: local, vimeoId, url: normalizedUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, vimeoId]);

  // Preview via oembed
  useEffect(() => {
    if (!vimeoId) {
      setTitle(null);
      setThumbnail(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setTitle(data.title ?? null);
        setThumbnail(data.thumbnail_url ?? null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [vimeoId]);

  const status = !local.trim()
    ? "empty"
    : vimeoId
    ? title
      ? "valid"
      : checking
      ? "checking"
      : "id_only"
    : "invalid";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              Sur Vimeo : clique sur la vidéo → bouton <strong>Share</strong> → copie le <strong>Video Link</strong> (<code>https://vimeo.com/...</code>). Assure-toi que la privacy est <em>"Anyone with the link"</em> ou autorise l'embed pour le domaine <code>plateforme.albarakaecosysteme.com</code>.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="bg-background"
      />
      {status === "invalid" && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Lien non reconnu. Colle une URL Vimeo complète ou l'ID numérique.
        </p>
      )}
      {status === "checking" && (
        <p className="text-xs text-muted-foreground">Vérification…</p>
      )}
      {status === "id_only" && (
        <p className="text-xs text-amber-500 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          ID détecté mais la vidéo n'est pas accessible publiquement. Vérifie la privacy sur Vimeo.
        </p>
      )}
      {status === "valid" && (
        <div className="flex items-center gap-3 p-2 rounded-md bg-emerald-500/5 border border-emerald-500/20">
          {thumbnail && (
            <img
              src={thumbnail}
              alt=""
              className="h-14 w-24 object-cover rounded border border-border/40 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-500 flex items-center gap-1.5 mb-0.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Vidéo détectée
            </p>
            <p className="text-sm font-medium text-foreground truncate">{title}</p>
            <p className="text-xs text-muted-foreground truncate">ID : {vimeoId}</p>
          </div>
        </div>
      )}
    </div>
  );
}
