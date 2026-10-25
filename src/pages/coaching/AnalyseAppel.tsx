// La fiche d'un appel : l'analyse en cours, l'écran de validation, ou le retour validé
// (copier le texte, télécharger le PDF, rouvrir pour corriger).
import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ArrowLeftRight, Copy, FileDown, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { demarrerAppel, rouvrirAppel, useAppel, useAudioAppel } from "@/hooks/useAppels";
import { avecVoix, duree, nomType, prenom, recalculer, texteEleve } from "@/lib/appels/retour";
import { SuiviAnalyse } from "@/components/appels/SuiviAnalyse";
import { PanneauEcoute, useLecteur } from "@/components/appels/PanneauEcoute";
import { ValidationAppel } from "@/components/appels/ValidationAppel";

export default function AnalyseAppel() {
  const { id } = useParams();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useAppel(id);
  const { data: audio } = useAudioAppel(a && !a.audio_supprime_le ? a.audio_path : null);
  const lecteur = useLecteur();
  const [inversion, setInversion] = useState(false);
  const [action, setAction] = useState(false);

  if (profile && !(profile.is_coach || profile.role === "ceo")) return <Navigate to="/dashboard" replace />;
  if (isLoading) return <Loader2 className="mx-auto my-24 h-6 w-6 animate-spin text-muted-foreground" />;
  if (error || !a) return <p className="py-16 text-center text-sm text-muted-foreground">Cet appel est introuvable.</p>;

  const recharger = () => {
    qc.invalidateQueries({ queryKey: ["appel", id] });
    qc.invalidateQueries({ queryKey: ["appels"] });
  };
  const prenomEleve = prenom(a.eleve?.full_name);
  const tours = avecVoix(a.transcription?.tours ?? [], a.voix_inversees);
  const analyse = a.analyse_coach ?? a.analyse_ia;

  async function agir(f: () => Promise<unknown>, succes?: string) {
    setAction(true);
    try {
      await f();
      if (succes) toast.success(succes);
      recharger();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'action a échoué.");
    } finally {
      setAction(false);
    }
  }

  const entete = (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
        <Link to="/coaching/analyse-appels">
          <ArrowLeft className="h-4 w-4" /> Analyse d'appels
        </Link>
      </Button>
      <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
        <h1 className="truncate text-xl font-bold">{a.eleve?.full_name ?? "Élève"}</h1>
        <p className="text-sm text-muted-foreground">
          {nomType(a.type_appel)} · {duree(a.duree_s)} · déposé le {new Date(a.cree_le).toLocaleDateString("fr-FR")}
          {a.coach?.full_name ? ` par ${a.coach.full_name}` : ""}
        </p>
      </div>
      {a.statut === "a_valider" && (
        <Button variant="outline" size="sm" className="ml-auto gap-2 sm:ml-0" onClick={() => setInversion(true)} disabled={action} data-testid="inverser-voix">
          <ArrowLeftRight className="h-4 w-4" /> Inverser les voix
        </Button>
      )}
    </div>
  );

  // ── analyse en cours, ou en erreur
  if (a.statut === "depose" || a.statut === "en_cours" || a.statut === "erreur") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {entete}
        <div className="rounded-xl border border-border bg-card p-5">
          {a.statut === "erreur" ? (
            <div className="space-y-4">
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">{a.erreur ?? "L'analyse a échoué."}</p>
              <Button onClick={() => agir(() => demarrerAppel(a.id, "lancer"), "Analyse relancée")} disabled={action || !!a.audio_supprime_le} className="gap-2">
                {action && <Loader2 className="h-4 w-4 animate-spin" />} Relancer l'analyse
              </Button>
            </div>
          ) : a.statut === "depose" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Le fichier a été déposé mais l'analyse n'a pas démarré.</p>
              <Button onClick={() => agir(() => demarrerAppel(a.id, "lancer"), "Analyse lancée")} disabled={action} className="gap-2">
                {action && <Loader2 className="h-4 w-4 animate-spin" />} Lancer l'analyse
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Environ 3 minutes. Tu peux quitter cette page : l'appel t'attendra dans « À valider ».</p>
              <SuiviAnalyse etape={a.etape} />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!analyse) return null;

  // ── retour validé
  if (a.statut === "valide") {
    const final = recalculer(analyse);
    const texte = texteEleve(final, prenomEleve || "toi");
    return (
      <div className="mx-auto max-w-3xl space-y-5" data-testid="retour-valide">
        {entete}
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            Validé{a.valideur?.full_name ? ` par ${prenom(a.valideur.full_name)}` : ""}
            {a.nb_corrections ? ` · ${a.nb_corrections} correction${a.nb_corrections > 1 ? "s" : ""}` : ""}
          </span>
          {a.exemple_reference && <span className="text-xs text-muted-foreground">Exemple de référence</span>}
        </p>
        <h2 className="text-2xl font-bold">Le retour pour {prenomEleve || "l'élève"}</h2>
        <pre className="whitespace-pre-wrap rounded-xl border border-border bg-card p-5 font-sans text-sm leading-relaxed">{texte}</pre>
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="gap-2" onClick={() => navigator.clipboard.writeText(texte).then(() => toast.success("Texte copié : colle-le dans WhatsApp ou Discord"))}>
            <Copy className="h-4 w-4" /> Copier le texte
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() =>
              import("@/components/appels/RetourAppelPdf")
                .then(({ telechargerRetour }) =>
                  telechargerRetour({
                    a: final,
                    eleve: a.eleve?.full_name ?? "Élève",
                    typeAppel: nomType(a.type_appel),
                    dureeS: a.duree_s,
                    date: new Date(a.cree_le).toLocaleDateString("fr-FR"),
                  }),
                )
                .catch(() => toast.error("Le PDF n'a pas pu être créé."))
            }
          >
            <FileDown className="h-4 w-4" /> Télécharger le PDF
          </Button>
          <Button variant="ghost" className="gap-2 text-muted-foreground" disabled={action} onClick={() => agir(() => rouvrirAppel(a.id))}>
            <RotateCcw className="h-4 w-4" /> Rouvrir pour corriger
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">En attendant l'espace élève : colle le texte dans WhatsApp ou Discord, ou envoie le PDF.</p>
      </div>
    );
  }

  // ── à valider
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {entete}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="order-2 min-w-0 lg:order-1">
          <ValidationAppel
            key={`${a.id}-${a.voix_inversees}-${a.analyse_ia ? "ia" : ""}`}
            appelId={a.id}
            ia={a.analyse_ia!}
            initial={a.analyse_coach}
            exempleInitial={a.exemple_reference}
            prenomEleve={prenomEleve}
            onEcouter={lecteur.ecouter}
            onValide={recharger}
          />
        </div>
        <aside className="order-1 lg:order-2 lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)]">
          <div className="h-[38vh] lg:h-full">
            <PanneauEcoute
              lecteur={lecteur}
              src={audio}
              tours={tours}
              duree={a.duree_s ?? 0}
              prenomEleve={prenomEleve}
              audioEfface={!!a.audio_supprime_le}
            />
          </div>
        </aside>
      </div>

      <AlertDialog open={inversion} onOpenChange={setInversion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inverser les voix ?</AlertDialogTitle>
            <AlertDialogDescription>
              À utiliser si l'IA a pris {prenomEleve || "l'élève"} pour le prospect. L'analyse est refaite avec les voix inversées (environ 1 minute) et tes
              corrections actuelles sont effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => agir(() => demarrerAppel(a.id, "inverser_voix"), "Analyse relancée avec les voix inversées")}>
              Inverser et refaire l'analyse
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
