// Studio vidéo : un montage. Écran d'attente (étapes en direct), puis résultat :
// lecteur, téléchargement, « Changer les réglages » et « Signaler un problème ».
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Download, Flag, Loader2, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { demarrer, lienStudio, signalerProbleme, useMontage, useRafraichirStudio } from "@/hooks/useStudio";
import { completerReglages, enTraitement, etapesAffichees, type Montage, type Reglages } from "@/lib/studio/reglages";
import { ApercuStudio } from "@/components/studio/ApercuStudio";
import { Bloc, BlocDesign, BlocSon, BlocSousTitres, BlocVisage } from "@/components/studio/Reglages";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Etapes({ m }: { m: Montage }) {
  const { etapes, courant: i } = etapesAffichees(m);
  return (
    <ol className="space-y-2" data-testid="etapes-montage">
      {etapes.map((e, k) => {
        const fait = i > k;
        const courant = i === k;
        return (
          <li key={e.id} className="flex items-center gap-3 text-sm">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border ${fait ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : courant ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {fait ? <Check className="h-3.5 w-3.5" /> : courant ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : k + 1}
            </span>
            <span className={fait || courant ? "text-foreground" : "text-muted-foreground"}>{e.nom}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function StudioMontage() {
  const { id } = useParams();
  const { data: m, isLoading } = useMontage(id);
  const rafraichir = useRafraichirStudio();
  const [video, setVideo] = useState<string | null>(null);
  const [modifier, setModifier] = useState(false);
  const [reglages, setReglages] = useState<Reglages | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [signal, setSignal] = useState<string | null>(null);

  useEffect(() => {
    if (m?.statut === "termine" && m.sortie_path) {
      lienStudio(m.sortie_path).then((u) => setVideo(`${u}&v=${m.version}`)).catch(() => setVideo(null));
    }
  }, [m?.statut, m?.sortie_path, m?.version]);

  useEffect(() => {
    if (modifier && m?.apercu?.fichier && !apercu) {
      lienStudio(`${m.user_id}/${m.id}/${m.apercu.fichier}`).then(setApercu).catch(() => undefined);
    }
  }, [modifier, m, apercu]);

  if (isLoading) return <Loader2 className="m-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (!m) return <p className="p-6 text-sm text-muted-foreground">Ce montage n'existe plus.</p>;

  const r = reglages ?? completerReglages(m.reglages);
  const sonChange =
    reglages &&
    (reglages.son.ameliorer !== completerReglages(m.reglages).son.ameliorer ||
      reglages.son.niveau !== completerReglages(m.reglages).son.niveau);

  async function relancer(nouveaux: Reglages) {
    setEnvoi(true);
    try {
      await demarrer(m!.id, "lancer", nouveaux);
      setModifier(false);
      setReglages(null);
      setVideo(null);
      rafraichir();
    } catch (e) {
      toast({ title: "Relance impossible", description: message(e), variant: "destructive" });
    } finally {
      setEnvoi(false);
    }
  }

  async function telecharger() {
    try {
      const nom = `${(m!.source_nom ?? "video").replace(/\.[^.]+$/, "")}-albaraka.mp4`;
      window.location.href = await lienStudio(m!.sortie_path!, nom);
    } catch (e) {
      toast({ title: "Téléchargement impossible", description: message(e), variant: "destructive" });
    }
  }

  async function envoyerSignalement() {
    if (!signal?.trim()) return;
    try {
      await signalerProbleme(m!.id, signal.trim());
      setSignal(null);
      toast({ title: "Merci, c'est transmis", description: "L'équipe AL BARAKA va regarder ta vidéo." });
    } catch (e) {
      toast({ title: "Envoi impossible", description: message(e), variant: "destructive" });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/studio">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
        </Button>
        <h1 className="truncate font-heading text-2xl text-foreground">{m.source_nom ?? "Ma vidéo"}</h1>
      </div>

      {(enTraitement(m) || m.statut === "import") && (
        <div className="grid gap-6 rounded-2xl border border-border p-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Montage en cours…</h2>
            <p className="text-sm text-muted-foreground">
              Compte quelques minutes. Tu peux fermer cette page : tu recevras une notification quand ta vidéo sera prête.
            </p>
          </div>
          <Etapes m={m} />
        </div>
      )}

      {(m.statut === "pret" || (m.statut === "preparation" && !m.lance)) && (
        <div className="space-y-3 rounded-2xl border border-border p-6">
          <p className="text-sm text-foreground">Ta vidéo est importée : il reste à choisir tes réglages.</p>
          <Button asChild>
            <Link to={`/studio/face-camera?id=${m.id}`}>Choisir mes réglages</Link>
          </Button>
        </div>
      )}

      {m.statut === "erreur" && (
        <div className="space-y-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-6">
          <p className="flex items-center gap-2 font-semibold text-red-200">
            <AlertTriangle className="h-4 w-4" /> Le montage n'a pas abouti
          </p>
          <p className="text-sm text-red-100/80">{m.erreur}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => relancer(r)} disabled={envoi} className="gap-2">
              {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Relancer le montage
            </Button>
            <Button variant="outline" onClick={() => setSignal("")} className="gap-2">
              <Flag className="h-4 w-4" /> Signaler un problème
            </Button>
          </div>
        </div>
      )}

      {m.statut === "termine" && !modifier && (
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="mx-auto aspect-[9/16] w-full max-w-[320px] overflow-hidden rounded-2xl border border-border bg-black">
            {video ? (
              <video src={video} controls playsInline className="h-full w-full" data-testid="studio-video" />
            ) : (
              <Loader2 className="m-auto mt-24 h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Ta vidéo est prête</h2>
              {m.rapport && (
                <p className="text-sm text-muted-foreground">
                  {Math.round(Number(m.rapport.entree_s))} s filmées, {Math.round(Number(m.rapport.sortie_s))} s gardées.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Elle reste dans ton espace jusqu'au{" "}
                {new Date(m.expire_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <Button onClick={telecharger} className="gap-2">
                <Download className="h-4 w-4" /> Télécharger
              </Button>
              <Button variant="outline" onClick={() => setModifier(true)} className="gap-2">
                <Settings2 className="h-4 w-4" /> Changer les réglages
              </Button>
              <Button variant="ghost" onClick={() => setSignal("")} className="gap-2 text-muted-foreground">
                <Flag className="h-4 w-4" /> Signaler un problème
              </Button>
            </div>
          </div>
        </div>
      )}

      {m.statut === "termine" && modifier && (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <Bloc titre="Visage">
              <BlocVisage reglages={r} onChange={setReglages} />
            </Bloc>
            <Bloc titre="Son">
              <BlocSon reglages={r} onChange={setReglages} />
            </Bloc>
            <Bloc titre="Sous-titres">
              <BlocSousTitres reglages={r} onChange={setReglages} />
            </Bloc>
            <Bloc titre="Design">
              <BlocDesign reglages={r} onChange={setReglages} />
            </Bloc>
            {sonChange && (
              <p className="text-xs text-amber-300">
                Le réglage du son a changé : tout le montage sera refait (quelques minutes).
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setModifier(false);
                  setReglages(null);
                }}
              >
                Annuler
              </Button>
              <Button onClick={() => relancer(r)} disabled={envoi} className="gap-2">
                {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Refaire la vidéo
              </Button>
            </div>
          </div>
          <div className="md:sticky md:top-4 md:self-start">
            <ApercuStudio image={apercu} visages={m.apercu?.visages ?? []} reglages={r} flou />
          </div>
        </div>
      )}

      <Dialog open={signal !== null} onOpenChange={(o) => !o && setSignal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
            <DialogDescription>Dis-nous ce qui ne va pas dans ta vidéo (mot coupé, sous-titre faux, visage visible…).</DialogDescription>
          </DialogHeader>
          <Textarea value={signal ?? ""} onChange={(e) => setSignal(e.target.value)} rows={4} maxLength={2000} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignal(null)}>
              Annuler
            </Button>
            <Button onClick={envoyerSignalement} disabled={!signal?.trim()}>
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
