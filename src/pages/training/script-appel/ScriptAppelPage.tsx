/**
 * Outil « Construire mon script d'appel » (cahier des charges de Sidali du
 * 12/10/2026) : l'élève construit son script d'appel découverte et son script
 * d'appel de transformation à partir des templates de Sidali, puis les
 * télécharge en PDF et en Word. Tout est au vouvoiement.
 *
 * Version Setter/Closer (par défaut) : un projet par infopreneur ou par niche,
 * champs vides au départ. Version Liberty (?version=liberty) : un seul projet,
 * pré-rempli avec l'offre saisie dans les modules Liberty.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPass } from "@/hooks/useUserPass";
import { useActionsProjetScript, useProjetsScript, type ProjetScript } from "@/hooks/useScriptsAppel";
import {
  SCRIPTS, champsManquants, reponseListe, reponseTexte,
  type Champ, type CleScript, type Reponses, type VersionOutil,
} from "@/lib/scriptsAppel";
import { nomOffreLiberty, preremplirLiberty } from "@/lib/scriptsAppel/liberty";
import { ApercuScript } from "@/components/scriptsAppel/ApercuScript";
import { telechargerScript } from "@/components/scriptsAppel/telecharger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft, ArrowRight, Check, Copy, FileDown, FileText, FolderOpen, Loader2,
  MessageCircle, Pencil, Phone, PhoneCall, Plus, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";

type Ecran = "intro" | "projets" | "choix" | "edition";

export default function ScriptAppelPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { hasLiberty } = useUserPass();
  const isCeo = profile?.role === "ceo";
  const version: VersionOutil = params.get("version") === "liberty" && (hasLiberty || isCeo) ? "liberty" : "setter_closer";

  const { data: projets, isLoading } = useProjetsScript(version);
  const actions = useActionsProjetScript(version);
  const [ecran, setEcran] = useState<Ecran>("intro");
  const [projetId, setProjetId] = useState<string | null>(null);
  const [cle, setCle] = useState<CleScript>("decouverte");
  const [preparation, setPreparation] = useState(false);
  const projet = projets?.find((p) => p.id === projetId) ?? null;

  // Version Liberty : un seul projet, créé (pré-rempli) à la première ouverture.
  async function ouvrirLiberty() {
    const existant = projets?.[0];
    if (existant) {
      setProjetId(existant.id);
      setEcran("choix");
      return;
    }
    setPreparation(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from("liberty_user_profile").select("data").eq("user_id", profile!.id).maybeSingle();
      const p = profile as { full_name?: string | null; city?: string | null } | null;
      const cree = await actions.creer.mutateAsync({
        nom: nomOffreLiberty(data?.data) ?? "Mon offre",
        reponses: preremplirLiberty(data?.data, p),
      });
      setProjetId(cree.id);
      setEcran("choix");
    } catch (e) {
      toast.error((e as Error).message ?? "Impossible de préparer vos scripts.");
    } finally {
      setPreparation(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => (ecran === "intro" ? navigate(-1) : setEcran(
          ecran === "edition" ? "choix" : ecran === "choix" && version === "setter_closer" ? "projets" : "intro",
        ))}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Construire mon script d'appel</h1>
          <p className="text-xs text-muted-foreground">
            {version === "liberty" ? "Parcours Liberty" : "Parcours Setter / Closer"} · appel découverte et appel de transformation
          </p>
        </div>
      </div>

      {ecran === "intro" && (
        <Introduction
          version={version}
          chargement={isLoading || preparation}
          onCommencer={() => (version === "liberty" ? ouvrirLiberty() : setEcran("projets"))}
        />
      )}

      {ecran === "projets" && (
        <ListeProjets
          projets={projets ?? []}
          chargement={isLoading}
          actions={actions}
          onOuvrir={(p) => { setProjetId(p.id); setEcran("choix"); }}
        />
      )}

      {ecran === "choix" && projet && (
        <ChoixScript projet={projet} onChoisir={(c) => { setCle(c); setEcran("edition"); }} />
      )}

      {ecran === "edition" && projet && (
        <Editeur key={`${projet.id}-${cle}`} projet={projet} cle={cle} version={version} actions={actions} />
      )}
    </div>
  );
}

function Introduction({ version, chargement, onCommencer }: { version: VersionOutil; chargement: boolean; onCommencer: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-6 sm:p-8 space-y-4 max-w-3xl">
      <h2 className="text-lg font-semibold text-foreground">Vos deux scripts, prêts à l'emploi</h2>
      <p className="text-sm text-muted-foreground">
        Cet outil reprend mot pour mot les deux scripts du programme Closing : l'<strong className="text-foreground">appel découverte</strong>,
        qui qualifie le prospect et fixe le rendez-vous, et l'<strong className="text-foreground">appel de transformation</strong>, l'appel de vente.
        Vous complétez les blancs étape par étape, vous voyez le script se construire à droite, puis vous le téléchargez en PDF et en Word.
      </p>
      {version === "setter_closer" ? (
        <div className="rounded-lg border bg-background/60 p-4 text-sm space-y-2">
          <p className="font-medium text-foreground">Avant de commencer : récupérez les informations auprès de l'infopreneur</p>
          <p className="text-muted-foreground">
            Son client idéal (situation actuelle, situation souhaitée, problème, objectif), sa promesse, les piliers de son programme,
            le bonus, l'accompagnement réel, le prix et la clause de garantie de son contrat. Vous pouvez créer un projet par infopreneur ou par niche.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-background/60 p-4 text-sm space-y-2">
          <p className="font-medium text-foreground">Les informations de votre offre ont été reprises</p>
          <p className="text-muted-foreground">
            Ce que vous avez saisi dans les modules Liberty (client idéal, promesse, piliers, prix, garantie…) remplit déjà vos scripts.
            Relisez chaque champ, complétez ce qui manque : vos modifications ici ne changent pas votre offre dans les autres modules.
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Vos réponses sont enregistrées automatiquement : vous pouvez quitter et revenir quand vous voulez.</p>
      <Button onClick={onCommencer} disabled={chargement} className="gap-2">
        {chargement ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Commencer
      </Button>
    </div>
  );
}

function ListeProjets({ projets, chargement, actions, onOuvrir }: {
  projets: ProjetScript[]; chargement: boolean;
  actions: ReturnType<typeof useActionsProjetScript>; onOuvrir: (p: ProjetScript) => void;
}) {
  const [nouveau, setNouveau] = useState("");
  const [enEdition, setEnEdition] = useState<{ id: string; nom: string } | null>(null);
  const [aSupprimer, setASupprimer] = useState<ProjetScript | null>(null);

  async function creer() {
    if (!nouveau.trim()) return;
    try {
      const p = await actions.creer.mutateAsync({ nom: nouveau });
      setNouveau("");
      onOuvrir(p);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">Nouveau projet de script</p>
        <p className="text-xs text-muted-foreground">Nommez-le d'après l'infopreneur ou la niche, par exemple « Coaching nutrition — Sarah ».</p>
        <div className="flex gap-2">
          <Input value={nouveau} onChange={(e) => setNouveau(e.target.value)} placeholder="Coaching nutrition — Sarah" maxLength={120}
            onKeyDown={(e) => e.key === "Enter" && creer()} />
          <Button onClick={creer} disabled={!nouveau.trim() || actions.creer.isPending} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Créer
          </Button>
        </div>
      </div>

      {chargement && <Skeleton className="h-20 w-full" />}
      {!chargement && projets.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun projet pour l'instant : créez le premier ci-dessus.</p>
      )}
      <div className="space-y-2">
        {projets.map((p) => {
          const remplis = (["decouverte", "transformation"] as CleScript[])
            .map((c) => SCRIPTS[c].champs.length - champsManquants(SCRIPTS[c], p.reponses).length);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
              <FolderOpen className="h-5 w-5 text-amber-500 shrink-0" />
              <div className="min-w-0 flex-1">
                {enEdition?.id === p.id ? (
                  <div className="flex gap-2">
                    <Input value={enEdition.nom} onChange={(e) => setEnEdition({ id: p.id, nom: e.target.value })} maxLength={120} autoFocus />
                    <Button size="icon" variant="outline" aria-label="Valider le nom" disabled={!enEdition.nom.trim()}
                      onClick={async () => { await actions.renommer.mutateAsync(enEdition); setEnEdition(null); }}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Annuler" onClick={() => setEnEdition(null)}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <>
                    <p className="truncate font-medium text-foreground">{p.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      Découverte {remplis[0]}/{SCRIPTS.decouverte.champs.length} · Transformation {remplis[1]}/{SCRIPTS.transformation.champs.length} champs remplis
                    </p>
                  </>
                )}
              </div>
              {enEdition?.id !== p.id && (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => onOuvrir(p)}>Ouvrir</Button>
                  <Button size="icon" variant="ghost" aria-label="Renommer" onClick={() => setEnEdition({ id: p.id, nom: p.nom })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Dupliquer" onClick={() => actions.dupliquer.mutate(p)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Supprimer" onClick={() => setASupprimer(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!aSupprimer} onOpenChange={(v) => !v && setASupprimer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {aSupprimer?.nom} » et les réponses de ses deux scripts seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (aSupprimer) actions.supprimer.mutate(aSupprimer.id); setASupprimer(null); }}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChoixScript({ projet, onChoisir }: { projet: ProjetScript; onChoisir: (c: CleScript) => void }) {
  const cartes: { cle: CleScript; icone: typeof Phone; texte: string }[] = [
    { cle: "decouverte", icone: Phone, texte: "Qualifier le prospect et fixer l'appel de transformation." },
    { cle: "transformation", icone: PhoneCall, texte: "L'appel de vente : présenter le programme, le prix et la garantie." },
  ];
  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-sm text-muted-foreground">Projet : <strong className="text-foreground">{projet.nom}</strong></p>
      <div className="grid gap-3 sm:grid-cols-2">
        {cartes.map(({ cle, icone: Icone, texte }) => {
          const def = SCRIPTS[cle];
          const manquants = champsManquants(def, projet.reponses).length;
          return (
            <button key={cle} onClick={() => onChoisir(cle)}
              className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-amber-500/60">
              <Icone className="h-6 w-6 text-amber-500" />
              <p className="mt-3 font-semibold text-foreground">Script {cle === "decouverte" ? "1" : "2"} — {def.titre}</p>
              <p className="mt-1 text-sm text-muted-foreground">{texte}</p>
              <Badge variant="outline" className="mt-3">
                {manquants === 0 ? "Complet" : `${manquants} champ${manquants > 1 ? "s" : ""} à compléter`}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChampSaisie({ champ, valeur, onChange, onFocus }: {
  champ: Champ; valeur: string | string[] | undefined; onChange: (v: string | string[]) => void; onFocus: () => void;
}) {
  const id = `champ-${champ.id}`;
  return (
    <div className="space-y-1.5" onFocus={onFocus}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {champ.libelle}{champ.facultatif && <span className="ml-1 text-xs text-muted-foreground">(facultatif)</span>}
      </label>
      <p className="text-xs text-muted-foreground">{champ.aide}</p>
      {champ.ethique && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">⚠ {champ.ethique}</p>
      )}
      {champ.type === "liste" ? (
        <SaisieListe id={id} valeur={Array.isArray(valeur) ? valeur : reponseListe({ v: valeur }, "v")} exemple={champ.exemple} onChange={onChange} />
      ) : champ.type === "long" ? (
        <Textarea id={id} rows={4} value={typeof valeur === "string" ? valeur : ""} placeholder={champ.exemple} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input id={id} value={typeof valeur === "string" ? valeur : ""} placeholder={champ.exemple}
          inputMode={champ.type === "nombre" ? "numeric" : undefined} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function SaisieListe({ id, valeur, exemple, onChange }: { id: string; valeur: string[]; exemple: string; onChange: (v: string[]) => void }) {
  const lignes = valeur.length ? valeur : [""];
  return (
    <div className="space-y-2">
      {lignes.map((l, i) => (
        <div key={i} className="flex gap-2">
          <Input id={i === 0 ? id : undefined} value={l} placeholder={i === 0 ? exemple : "Une autre question"}
            onChange={(e) => onChange(lignes.map((x, j) => (j === i ? e.target.value : x)))} />
          {lignes.length > 1 && (
            <Button size="icon" variant="ghost" aria-label="Retirer cette ligne" onClick={() => onChange(lignes.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      <Button size="sm" variant="outline" className="gap-1" onClick={() => onChange([...lignes, ""])}>
        <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
      </Button>
    </div>
  );
}

function Editeur({ projet, cle, version, actions }: {
  projet: ProjetScript; cle: CleScript; version: VersionOutil; actions: ReturnType<typeof useActionsProjetScript>;
}) {
  const def = SCRIPTS[cle];
  const [reponses, setReponses] = useState<Reponses>(projet.reponses ?? {});
  const [etape, setEtape] = useState(0);
  const [actif, setActif] = useState<string | null>(null);
  const [etat, setEtat] = useState<"enregistre" | "en_cours" | "erreur">("enregistre");
  const [generation, setGeneration] = useState<"pdf" | "docx" | null>(null);
  const [rappelWhatsapp, setRappelWhatsapp] = useState(false);
  const aEnregistrer = useRef<Reponses | null>(null);
  const champsParId = useMemo(() => new Map(def.champs.map((c) => [c.id, c])), [def]);
  const manquants = champsManquants(def, reponses);
  // Références stables : l'objet de mutation change à chaque rendu.
  const enregistrerRef = useRef(actions.enregistrer.mutateAsync);
  enregistrerRef.current = actions.enregistrer.mutateAsync;
  const rafraichirRef = useRef(actions.rafraichir);
  rafraichirRef.current = actions.rafraichir;

  // Enregistrement automatique, 0,7 s après la dernière frappe.
  useEffect(() => {
    if (!aEnregistrer.current) return;
    setEtat("en_cours");
    const t = setTimeout(async () => {
      const r = aEnregistrer.current;
      if (!r) return;
      try {
        await enregistrerRef.current({ id: projet.id, reponses: r });
        if (aEnregistrer.current === r) aEnregistrer.current = null;
        setEtat("enregistre");
      } catch {
        setEtat("erreur");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [reponses, projet.id]);

  // En quittant l'éditeur : dernier enregistrement, puis la liste se met à jour.
  useEffect(() => () => {
    const r = aEnregistrer.current;
    if (r) enregistrerRef.current({ id: projet.id, reponses: r }).finally(() => rafraichirRef.current());
    else rafraichirRef.current();
  }, [projet.id]);

  function modifier(id: string, v: string | string[]) {
    setReponses((prev) => {
      const suivant = { ...prev, [id]: v };
      aEnregistrer.current = suivant;
      return suivant;
    });
  }

  async function telecharger(format: "pdf" | "docx") {
    setGeneration(format);
    try {
      await telechargerScript(format, def, reponses, projet.nom);
      if (version === "liberty") setRappelWhatsapp(true);
    } catch (e) {
      toast.error(`Le document n'a pas pu être généré : ${(e as Error).message}`);
    } finally {
      setGeneration(null);
    }
  }

  const etapeCourante = def.etapes[etape];
  const remplisEtape = (champs: string[]) =>
    champs.filter((id) => champsParId.get(id)?.type === "liste" ? reponseListe(reponses, id).length > 0 : !!reponseTexte(reponses, id)).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Script {cle === "decouverte" ? "1" : "2"} — {def.titre}</p>
          <p className="text-xs text-muted-foreground">
            {projet.nom} · {etat === "en_cours" ? "Enregistrement…" : etat === "erreur" ? "Non enregistré, vérifiez votre connexion" : "Enregistré"}
            {" · "}{manquants.length === 0 ? "tous les champs sont remplis" : `${manquants.length} champ${manquants.length > 1 ? "s" : ""} à compléter`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled={!!generation} onClick={() => telecharger("pdf")}>
            {generation === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} PDF
          </Button>
          <Button variant="outline" className="gap-2" disabled={!!generation} onClick={() => telecharger("docx")}>
            {generation === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Word
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {def.etapes.map((e, i) => {
              const fait = remplisEtape(e.champs) === e.champs.filter((id) => !champsParId.get(id)?.facultatif).length;
              return (
                <button key={e.titre} onClick={() => setEtape(i)}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${i === etape ? "border-amber-500 bg-amber-500/15 text-foreground" : "text-muted-foreground hover:border-amber-500/50"}`}>
                  {fait && <Check className="mr-1 inline h-3 w-3 text-emerald-500" />}{i + 1}. {e.titre}
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border bg-card p-4 space-y-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Étape {etape + 1} / {def.etapes.length} · {etapeCourante.titre}</p>
            {etapeCourante.champs.map((id) => {
              const champ = champsParId.get(id)!;
              return <ChampSaisie key={id} champ={champ} valeur={reponses[id]} onChange={(v) => modifier(id, v)} onFocus={() => setActif(id)} />;
            })}
            <div className="flex justify-between pt-2">
              <Button variant="outline" disabled={etape === 0} onClick={() => setEtape(etape - 1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Précédent
              </Button>
              {etape < def.etapes.length - 1 ? (
                <Button onClick={() => setEtape(etape + 1)} className="gap-2">Suivant <ArrowRight className="h-4 w-4" /></Button>
              ) : (
                <Button onClick={() => telecharger("pdf")} disabled={!!generation} className="gap-2">
                  <FileDown className="h-4 w-4" /> Télécharger mon script
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto rounded-xl border bg-muted/40 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Aperçu en direct · les blancs en orange restent à compléter</p>
          <ApercuScript def={def} reponses={reponses} projet={projet.nom} champActif={actif} />
        </div>
      </div>

      <Dialog open={rappelWhatsapp} onOpenChange={setRappelWhatsapp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-500" /> Dernière étape : la validation</DialogTitle>
            <DialogDescription>
              Relisez votre script, personnalisez ce qui reste à compléter, puis envoyez-le à Sidali sur WhatsApp pour qu'il le valide.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setRappelWhatsapp(false)}>C'est noté</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
