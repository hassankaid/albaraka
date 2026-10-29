// Studio vidéo, outil Voix off (cahier des charges de Sidali, section 3) :
// 1. le script (l'IA en déduit le thème, modifiable) ; 2. la voix, lue au prompteur
// (ou un enregistrement importé) ; 3. son, sous-titres, design, puis « Lancer le montage ».
// Pendant que l'élève règle, la machine prépare déjà la voix et choisit les plans.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Headphones, Loader2, Mic2, Sparkles, Upload, Volume2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { demarrer, detecterTheme, importerVoix, useMontage, useThemes } from "@/hooks/useStudio";
import { completerReglages, messageErreur, REGLAGES_PAR_DEFAUT, type Reglages } from "@/lib/studio/reglages";
import { compterMots, dureeLecture, ENREGISTREMENT_MAX_S, SCRIPT_MAX, secondesLecture, verifierAudio } from "@/lib/studio/voixoff";
import { EnregistreurVoix } from "@/components/studio/EnregistreurVoix";
import { VerifierCoupes } from "@/components/studio/VerifierCoupes";
import { CorrigerSousTitres } from "@/components/studio/CorrigerSousTitres";
import { Bloc, BlocCoupes, BlocDesign, BlocSon, BlocSousTitres } from "@/components/studio/Reglages";
import { BandeauQuota, QuotaAtteint, quotaEpuise } from "@/components/studio/QuotaStudio";
import { messageDureeGratuite, minutes } from "@/lib/studio/reglages";
import { memeScript } from "@/lib/studio/scripts";
import { useStudioAcces } from "@/hooks/useStudioAcces";
import { useQueryClient } from "@tanstack/react-query";

type Ecran = "script" | "voix" | "reglages";
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Durée d'un fichier audio lue par le navigateur, ou null s'il ne sait pas (le moteur vérifie). */
function dureeAudio(f: File): Promise<number | null> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(f);
    const a = document.createElement("audio");
    const fin = (d: number | null) => {
      URL.revokeObjectURL(url);
      ok(d);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => fin(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => fin(null);
    setTimeout(() => fin(null), 5000);
    a.src = url;
  });
}

/** « Voix off — T'as vu Allah, subhanahu wa… » plutôt que « voix-off.webm » dans « Mes vidéos ». */
function titreEnregistrement(script: string) {
  const mots = script.replace(/\s+/g, " ").trim().split(" ");
  const debut = mots.slice(0, 6).join(" ").slice(0, 48);
  return `Voix off — ${debut}${mots.length > 6 ? "…" : ""}.webm`;
}

export default function StudioVoixOff() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: acces } = useStudioAcces();
  const [params, setParams] = useSearchParams();
  const id = params.get("id") ?? undefined;
  const { data: montage } = useMontage(id);
  const { data: themes } = useThemes();
  const [ecran, setEcran] = useState<Ecran>(id ? "reglages" : "script");
  // Depuis la bibliothèque de scripts : le script choisi arrive prérempli.
  const depuisBibliotheque = useLocation().state as { script?: string; theme?: string | null; scriptId?: string } | null;
  const [script, setScript] = useState(() => (depuisBibliotheque?.script ?? "").slice(0, SCRIPT_MAX));
  const [theme, setTheme] = useState<string | null>(depuisBibliotheque?.theme ?? null);
  const [detection, setDetection] = useState(false);
  const [envoi, setEnvoi] = useState<number | null>(null);
  const [reglages, setReglages] = useState<Reglages>(REGLAGES_PAR_DEFAUT);
  const [lancement, setLancement] = useState(false);
  const [verifier, setVerifier] = useState(false);
  const [corriger, setCorriger] = useState(false);
  const charge = useRef(false);

  useEffect(() => {
    if (montage && !charge.current) {
      charge.current = true;
      if (Object.keys(montage.reglages ?? {}).length) setReglages(completerReglages(montage.reglages));
    }
  }, [montage]);

  async function continuerScript() {
    setDetection(true);
    try {
      setTheme(await detecterTheme(script));
    } catch (e) {
      toast({ title: "Thème non détecté", description: `${message(e)}. Choisis-le dans la liste.`, variant: "destructive" });
      setTheme(themes?.[0]?.id ?? null);
    } finally {
      setDetection(false);
    }
  }

  async function envoyer(voix: Blob, nom: string) {
    if (!theme) return;
    setEnvoi(0);
    try {
      // Script de la bibliothèque gardé dans l'essentiel : il devient « déjà tourné ».
      const scriptId =
        depuisBibliotheque?.scriptId && depuisBibliotheque.script && memeScript(depuisBibliotheque.script, script)
          ? depuisBibliotheque.scriptId
          : null;
      const nouvelId = await importerVoix(voix, nom, script, theme, setEnvoi, scriptId);
      setParams({ id: nouvelId }, { replace: true });
      setEcran("reglages");
      setEnvoi(null);
      await demarrer(nouvelId, "preparer");
      queryClient.invalidateQueries({ queryKey: ["studio", "acces"] });
      queryClient.invalidateQueries({ queryKey: ["studio", "scripts", "tournes"] });
    } catch (e) {
      setEnvoi(null);
      toast({ title: "Envoi impossible", description: message(e), variant: "destructive" });
    }
  }

  async function lancer() {
    if (!id) return;
    setLancement(true);
    try {
      await demarrer(id, "lancer", reglages);
      navigate(`/studio/montage/${id}`);
    } catch (e) {
      setLancement(false);
      toast({ title: "Lancement impossible", description: message(e), variant: "destructive" });
    }
  }

  const nomTheme = themes?.find((t) => t.id === theme)?.nom;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/studio">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
        </Button>
        <h1 className="font-heading text-2xl text-foreground">Voix off</h1>
      </div>

      <ol className="flex gap-2 text-xs">
        {(["script", "voix", "reglages"] as Ecran[]).map((e, i) => (
          <li
            key={e}
            className={`flex-1 rounded-full px-3 py-1.5 text-center ${ecran === e ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1}. {e === "script" ? "Ton script" : e === "voix" ? "Ta voix" : "Son et sous-titres"}
          </li>
        ))}
      </ol>

      {!id && ecran !== "reglages" && <BandeauQuota />}
      {!id && ecran !== "reglages" && quotaEpuise(acces) && envoi === null ? (
        <QuotaAtteint />
      ) : ecran === "script" && (
        <div className="space-y-4">
          <Bloc titre="Ton script">
            <Textarea
              value={script}
              onChange={(e) => {
                setScript(e.target.value.slice(0, SCRIPT_MAX));
                setTheme(null);
              }}
              rows={12}
              placeholder="Colle ou écris ici le texte que tu vas lire. L'IA s'en sert pour choisir les plans et écrire les sous-titres sans faute."
              className="text-base leading-relaxed"
              data-testid="voix-off-script"
            />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {compterMots(script)} mots · environ {dureeLecture(script)} de lecture
                {acces?.duree_max_s && secondesLecture(script) > acces.duree_max_s && (
                  <span className="ml-1 text-amber-500" data-testid="script-trop-long-gratuit">
                    · trop long pour la version gratuite ({minutes(acces.duree_max_s)} de voix au plus)
                  </span>
                )}
              </span>
              <span>
                {script.length} / {SCRIPT_MAX} caractères
              </span>
            </div>
          </Bloc>

          {theme ? (
            <Bloc titre="Thème détecté">
              <div className="flex flex-wrap items-center gap-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-foreground">
                  L'IA a détecté : <span className="font-semibold">{nomTheme}</span>. Tu peux le changer :
                </span>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(themes ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setEcran("voix")} className="gap-2">
                  <Mic2 className="h-4 w-4" /> Enregistrer ma voix
                </Button>
              </div>
            </Bloc>
          ) : (
            <div className="flex justify-end">
              <Button onClick={continuerScript} disabled={compterMots(script) < 5 || detection} className="gap-2">
                {detection ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Continuer
              </Button>
            </div>
          )}
        </div>
      )}

      {ecran === "voix" && !(!id && quotaEpuise(acces) && envoi === null) && (
        <div className="space-y-4">
          {envoi !== null ? (
            <div className="space-y-3 rounded-2xl border border-border p-6">
              <p className="text-sm font-medium text-foreground">Envoi de ta voix… {envoi} %</p>
              <Progress value={envoi} />
            </div>
          ) : (
            <>
              <div className="grid gap-3 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-3">
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Une pièce calme, sans écho.
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Mic2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Le micro à 20 cm de ta bouche.
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <Headphones className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Des écouteurs avec micro, si tu en as.
                </p>
              </div>
              <EnregistreurVoix
                script={script}
                dureeMax={acces?.duree_max_s ?? ENREGISTREMENT_MAX_S}
                onValider={(voix) => envoyer(voix, titreEnregistrement(script))}
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:border-primary/60">
                <Upload className="h-4 w-4" /> Ou importe un enregistrement déjà fait (MP3, M4A, WAV…)
                <input
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac"
                  className="hidden"
                  data-testid="voix-off-fichier"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const refus = verifierAudio(f);
                    if (refus) return toast({ title: "Fichier refusé", description: refus, variant: "destructive" });
                    dureeAudio(f).then((d) => {
                      // 3 minutes en voix off (Sidali, 13/10/2026) ; le moteur vérifie aussi.
                      if (d && d > ENREGISTREMENT_MAX_S + 5) {
                        return toast({ title: "Voix off trop longue", description: "3 minutes maximum : raccourcis ton script.", variant: "destructive" });
                      }
                      if (d && acces?.duree_max_s && d > acces.duree_max_s + 5) {
                        return toast({ title: "Voix off trop longue pour la version gratuite", description: messageDureeGratuite(acces.duree_max_s), variant: "destructive" });
                      }
                      envoyer(f, f.name);
                    });
                  }}
                />
              </label>
              <Button variant="ghost" onClick={() => setEcran("script")}>
                Retour au script
              </Button>
            </>
          )}
        </div>
      )}

      {ecran === "reglages" && (
        <div className="space-y-4">
          {montage?.statut === "erreur" && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {montage.erreur ? messageErreur(montage.erreur).texte : "La préparation a échoué."} Tu peux quand même lancer le montage : il reprendra depuis le début.
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Pendant que tu règles, l'équipe prépare ta voix et choisit les plans dans la banque AL BARAKA.
          </p>
          <Bloc titre="Son">
            <BlocSon reglages={reglages} onChange={setReglages} />
          </Bloc>
          <Bloc titre="Sous-titres">
            <BlocSousTitres
              reglages={reglages}
              onChange={setReglages}
              onCorriger={montage?.travail_pret ? () => setCorriger(true) : undefined}
            />
          </Bloc>
          <Bloc titre="Design">
            <BlocDesign reglages={reglages} onChange={setReglages} />
          </Bloc>
          <Bloc titre="Coupes">
            <BlocCoupes reglages={reglages} onChange={setReglages} onVerifier={montage?.travail_pret ? () => setVerifier(true) : undefined} />
          </Bloc>
          <div className="flex justify-end">
            <Button onClick={lancer} disabled={lancement || !id} className="gap-2" size="lg">
              {lancement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Lancer le montage
            </Button>
          </div>
        </div>
      )}

      {montage?.travail_pret && (
        <VerifierCoupes
          open={verifier}
          onOpenChange={setVerifier}
          montage={montage}
          reglages={reglages}
          libelleValider="Valider ces coupes"
          onValider={(plages) => setReglages({ ...reglages, coupes: { ...reglages.coupes, plages } })}
        />
      )}
      {montage?.travail_pret && (
        <CorrigerSousTitres
          open={corriger}
          onOpenChange={setCorriger}
          montage={montage}
          reglages={reglages}
          libelleValider="Valider ces sous-titres"
          onValider={(corrections) => setReglages({ ...reglages, sous_titres: { ...reglages.sous_titres, corrections } })}
        />
      )}
    </div>
  );
}
