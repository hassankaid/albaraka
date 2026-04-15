import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle, Info, ShieldCheck } from "lucide-react";
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

  // Preview via oembed (peut échouer si vidéo privée avec domaine whitelisté)
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
        if (cancelled) return;
        setTitle(data?.title ?? null);
        setThumbnail(data?.thumbnail_url ?? null);
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
      : "id_only_private"
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
            <TooltipContent className="max-w-sm text-xs space-y-2">
              <p><strong>Étape 1 — Récupérer le lien</strong></p>
              <p>Dans Vimeo, clique sur ta vidéo → bouton <strong>Share</strong> → copie le <strong>Video Link</strong> (<code>https://vimeo.com/...</code>).</p>
              <p><strong>Étape 2 — Privacy recommandée</strong></p>
              <p>Pour protéger ton contenu tout en le rendant lisible sur la plateforme, sur Vimeo : <strong>Settings → Privacy</strong> :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><em>Who can watch?</em> → <strong>Hide this video from Vimeo.com</strong></li>
                <li><em>Where can this video be embedded?</em> → <strong>Specific domains</strong> → ajouter <code className="break-all">plateforme.albarakaecosysteme.com</code></li>
              </ul>
              <p>Ainsi la vidéo n'est <strong>pas</strong> accessible sur vimeo.com ni ailleurs, mais joue parfaitement sur la plateforme.</p>
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
      {status === "id_only_private" && (
        <div className="space-y-2 p-3 rounded-md bg-amber-500/5 border border-amber-500/30">
          <p className="text-xs text-amber-500 flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            Vidéo détectée (ID : {vimeoId}) — privée, c'est normal
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            L'aperçu ne peut pas s'afficher ici car la vidéo est protégée sur Vimeo. C'est <strong>exactement ce qu'on veut</strong> pour une formation payante.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Pense à autoriser le domaine <code className="text-foreground">plateforme.albarakaecosysteme.com</code> dans les paramètres Vimeo (<em>Privacy → Where can this video be embedded? → Specific domains</em>) pour que les élèves puissent la lire sur la plateforme.
          </p>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Prévisualiser dans cet onglet (admin uniquement)</summary>
            <div className="mt-2 aspect-video w-full rounded overflow-hidden border border-border/40">
              <iframe
                src={`https://player.vimeo.com/video/${vimeoId}?h=auto&byline=0&portrait=0`}
                className="w-full h-full"
                frameBorder={0}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title="Aperçu Vimeo"
              />
            </div>
          </details>
        </div>
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
