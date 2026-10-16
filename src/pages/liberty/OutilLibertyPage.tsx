/**
 * Page d'un outil du Parcours Liberty (cahier des charges de Sidali du 15/10/2026) :
 * des écrans courts avec une barre de progression et Précédent / Suivant, une aide
 * et un exemple grisé sous chaque champ, la sauvegarde à chaque champ (profil
 * partagé), l'aperçu du document et son téléchargement en PDF et en Word à tout
 * moment. Utilisable sur téléphone. Accès : Pass Liberty, ou CEO.
 */
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CloudOff, Eye, FileDown, FileText, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { useLibertyProfil } from "@/hooks/useLibertyProfil";
import { champRempli, outilLiberty } from "@/lib/liberty/outils";
import { RAPPEL_VALIDATION } from "@/lib/liberty/outils/docx";
import { ChampOutil } from "@/components/liberty/outils/ChampOutil";
import { ApercuDocument } from "@/components/liberty/outils/ApercuDocument";
import { telechargerDocument } from "@/components/liberty/outils/telecharger";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function lireEcran(code: string): number {
  try {
    return Number(localStorage.getItem(`liberty_outil_ecran_${code}`)) || 0;
  } catch {
    return 0;
  }
}

function retenirEcran(code: string, i: number) {
  try {
    localStorage.setItem(`liberty_outil_ecran_${code}`, String(i));
  } catch {
    /* navigation privée : on oublie simplement l'écran */
  }
}

export default function OutilLibertyPage() {
  const { code } = useParams<{ code: string }>();
  const def = outilLiberty(code);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { hasLiberty, isLoading: chargementPass } = useUserPass();
  const isCeo = profile?.role === "ceo";
  const { profil, modifier, etat, chargement, reessayer } = useLibertyProfil();
  const [ecran, setEcran] = useState(() => (code ? lireEcran(code) : 0));
  const [apercu, setApercu] = useState(false);
  const [envoi, setEnvoi] = useState<"pdf" | "docx" | null>(null);

  // le chapitre de l'outil dans le parcours, pour le bouton « Retour »
  const { data: chapitre } = useQuery({
    queryKey: ["liberty-outil-chapitre", code],
    enabled: !!code,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("formation_chapitres").select("id").eq("outil", code).limit(1).maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
  });

  const n = def?.ecrans.length ?? 0;
  const i = Math.min(Math.max(0, ecran), Math.max(0, n - 1));
  useEffect(() => {
    if (code) retenirEcran(code, i);
    window.scrollTo({ top: 0 });
  }, [code, i]);

  const document = useMemo(() => (def ? def.document(profil) : null), [def, profil]);
  const eleve = profile?.full_name?.trim() ?? "";

  if (!def) return <Navigate to="/training/parcours-liberty" replace />;
  if (!chargementPass && !isCeo && !hasLiberty) return <Navigate to="/training" replace />;

  const courant = def.ecrans[i];
  const retour = () => navigate(chapitre ? `/training/parcours-liberty/chapitre/${chapitre}` : "/training/parcours-liberty");

  async function telecharger(format: "pdf" | "docx") {
    if (!def || !document) return;
    setEnvoi(format);
    try {
      await reessayer();
      await telechargerDocument(format, def, document, eleve);
    } catch {
      toast.error("Le document n'a pas pu être généré. Réessayez dans un instant.");
    } finally {
      setEnvoi(null);
    }
  }

  const boutonsTelecharger = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!!envoi} onClick={() => telecharger("pdf")} data-testid="telecharger-pdf">
        {envoi === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!!envoi} onClick={() => telecharger("docx")} data-testid="telecharger-word">
        {envoi === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Word
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6" data-testid="outil-liberty">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" className="gap-1.5 px-2" onClick={retour}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Parcours Liberty · {def.etape}</p>
            <h1 className="text-xl font-bold text-foreground">Outil {def.numero} — {def.nom}</h1>
            <p className="text-sm text-muted-foreground">{def.objectif}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("flex items-center gap-1 text-xs", etat === "erreur" ? "text-red-500" : "text-muted-foreground")} data-testid="etat-enregistrement">
            {etat === "en_cours" ? <><Loader2 className="h-3 w-3 animate-spin" /> Enregistrement…</>
              : etat === "erreur" ? <><CloudOff className="h-3 w-3" /> Non enregistré <button className="underline" onClick={() => reessayer()}>réessayer</button></>
              : <><Check className="h-3 w-3" /> Enregistré</>}
          </span>
          {boutonsTelecharger}
        </div>
      </header>

      {/* barre de progression : un écran = un thème */}
      <nav className="space-y-2" aria-label="Écrans de l'outil">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${((i + 1) / n) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {def.ecrans.map((e, k) => {
            const remplis = e.champs.filter((c) => champRempli(profil, c)).length;
            return (
              <button key={e.titre} type="button" onClick={() => setEcran(k)}
                className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
                  k === i ? "border-amber-500 bg-amber-500/15 font-medium text-amber-600"
                    : remplis ? "border-emerald-500/40 text-emerald-600" : "border-border text-muted-foreground hover:text-foreground")}>
                {k + 1}. {e.titre}{remplis > 0 && k !== i ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <section className="space-y-5 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Écran {i + 1} / {n}</p>
            <h2 className="text-lg font-semibold text-foreground">{courant.titre}</h2>
            {courant.intro && <p className="text-sm text-muted-foreground">{courant.intro}</p>}
          </div>

          {chargement ? (
            <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-24" /><Skeleton className="h-10" /></div>
          ) : (
            courant.champs.map((c) => <ChampOutil key={c.cle} champ={c} profil={profil} onChange={modifier} />)
          )}

          {courant.apercu && document && (
            <div className="space-y-2 lg:hidden">
              <p className="text-sm font-medium">L'aperçu de votre document</p>
              <ApercuDocument def={def} document={document} eleve={eleve} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="outline" size="sm" className="gap-1.5" disabled={i === 0} onClick={() => setEcran(i - 1)}>
              <ArrowLeft className="h-4 w-4" /> Précédent
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 lg:hidden" onClick={() => setApercu(true)}>
              <Eye className="h-4 w-4" /> Aperçu
            </Button>
            {i < n - 1 ? (
              <Button size="sm" className="gap-1.5" onClick={() => setEcran(i + 1)}>
                Suivant <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" className="gap-1.5" disabled={!!envoi} onClick={() => telecharger("pdf")}>
                <FileDown className="h-4 w-4" /> Télécharger
              </Button>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-4 space-y-2">
            <p className="text-xs text-muted-foreground">Aperçu en direct · les informations vides apparaissent « à compléter »</p>
            <div className="max-h-[calc(100vh-8rem)] overflow-y-auto rounded-lg border border-border bg-neutral-100 p-2">
              {document && <ApercuDocument def={def} document={document} eleve={eleve} />}
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-foreground">
          <MessageCircle className="h-4 w-4 shrink-0 text-amber-600" /> {RAPPEL_VALIDATION}
        </p>
        {boutonsTelecharger}
      </div>

      <Dialog open={apercu} onOpenChange={setApercu}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto bg-neutral-100 p-3">
          <DialogHeader><DialogTitle className="text-neutral-900">Aperçu du document</DialogTitle></DialogHeader>
          {document && <ApercuDocument def={def} document={document} eleve={eleve} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
