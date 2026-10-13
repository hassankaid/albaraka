// Studio, bibliothèque de scripts vidéo (Sidali, 13/10/2026) : les membres cherchent
// un script par thème ou par mot, le lisent, le copient ou tournent directement avec
// en Voix off (le script arrive prérempli dans le prompteur).
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Loader2, Mic, Search, Settings2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useThemes } from "@/hooks/useStudio";
import { useComptesThemesScripts, useScriptsStudio } from "@/hooks/useStudioScripts";
import { proposerAccroche, typographie, type ScriptStudio } from "@/lib/studio/scripts";
import { dureeLecture } from "@/lib/studio/voixoff";

export function useRechercheDifferee(valeur: string, delai = 300) {
  const [differee, setDifferee] = useState(valeur);
  useEffect(() => {
    const t = setTimeout(() => setDifferee(valeur), delai);
    return () => clearTimeout(t);
  }, [valeur, delai]);
  return differee;
}

function LectureScript({
  script,
  nomTheme,
  onFermer,
}: {
  script: ScriptStudio | null;
  nomTheme: (id: string | null) => string | null;
  onFermer: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copie, setCopie] = useState(false);

  async function copier() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script.texte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  return (
    <Dialog open={!!script} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {script && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-xl">{typographie(script.titre)}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                {nomTheme(script.theme_id) && <Badge variant="secondary">{nomTheme(script.theme_id)}</Badge>}
                <span>environ {dureeLecture(script.texte)} de lecture</span>
              </DialogDescription>
            </DialogHeader>
            <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-[15px] leading-relaxed" data-testid="script-texte">
              {typographie(script.texte)}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="gap-2" onClick={copier}>
                {copie ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                {copie ? "Copié" : "Copier le script"}
              </Button>
              <Button
                className="gap-2"
                onClick={() => navigate("/studio/voix-off", { state: { script: script.texte, theme: script.theme_id } })}
              >
                <Mic className="h-4 w-4" /> Tourner en voix off avec ce script
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function StudioScripts() {
  const { profile } = useAuth();
  const { data: themes = [] } = useThemes();
  const { data: comptes = {} } = useComptesThemesScripts();
  const [saisie, setSaisie] = useState("");
  const recherche = useRechercheDifferee(saisie);
  const [theme, setTheme] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<ScriptStudio | null>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useScriptsStudio({ recherche, theme });

  const scripts = data?.pages.flatMap((p) => p.scripts) ?? [];
  const total = data?.pages[0]?.total ?? 0;
  const nomTheme = (id: string | null) => themes.find((t) => t.id === id)?.nom ?? null;
  const themesAvecScripts = themes.filter((t) => comptes[t.id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link to="/studio" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
          <h1 className="font-heading text-3xl text-foreground">Bibliothèque de scripts</h1>
          <p className="text-sm text-muted-foreground">
            Des scripts qui ont fait leurs preuves : inspire-toi, ou suis-les tels quels pour tourner ta vidéo.
          </p>
        </div>
        {profile?.role === "ceo" && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/studio/scripts/gerer">
              <Settings2 className="h-4 w-4" /> Gérer la bibliothèque
            </Link>
          </Button>
        )}
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="Chercher un script : salariat, dettes, motivation…"
          className="h-11 pl-9"
          aria-label="Chercher un script"
        />
      </div>

      {themesAvecScripts.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid="filtres-themes">
          <Button size="sm" variant={theme === null ? "default" : "outline"} className="h-8 rounded-full" onClick={() => setTheme(null)}>
            Tous les thèmes
          </Button>
          {themesAvecScripts.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={theme === t.id ? "default" : "outline"}
              className="h-8 rounded-full"
              onClick={() => setTheme(theme === t.id ? null : t.id)}
            >
              {t.nom} <span className="ml-1.5 text-xs opacity-70">{comptes[t.id]}</span>
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : scripts.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          {recherche || theme ? "Aucun script ne correspond à ta recherche." : "La bibliothèque arrive très bientôt."}
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} script{total > 1 ? "s" : ""}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scripts.map((s) => (
              <Card
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setOuvert(s)}
                onKeyDown={(e) => e.key === "Enter" && setOuvert(s)}
                className="cursor-pointer transition-colors hover:border-primary/50"
                data-testid="carte-script"
              >
                <CardContent className="flex h-full flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    {nomTheme(s.theme_id) && <Badge variant="secondary" className="text-[11px]">{nomTheme(s.theme_id)}</Badge>}
                    {s.mis_en_avant && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Mis en avant" />}
                    <span className="ml-auto text-xs text-muted-foreground">{dureeLecture(s.texte)}</span>
                  </div>
                  <h3 className="font-semibold leading-snug text-foreground">{typographie(s.titre)}</h3>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{typographie(s.accroche || proposerAccroche(s.texte))}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2">
                {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />} Voir plus de scripts
              </Button>
            </div>
          )}
        </>
      )}

      <LectureScript script={ouvert} nomTheme={nomTheme} onFermer={() => setOuvert(null)} />
    </div>
  );
}
