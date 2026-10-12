// Studio, Voix off : la banque de vidéos (cahier des charges de Sidali, section 7).
// Import, indexation sur machine (plans, fiche de l'IA, vecteur de sens), puis revue :
// chaque plan avec sa fiche, filtres par thème, exclusion, plans de secours « ambiance
// AL BARAKA », et le rapport des thèmes qui manquent de plans.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Ban, Check, LifeBuoy, Loader2, Pencil, RefreshCw, Search, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  importerDansBanque,
  lancerIndexation,
  liensBanque,
  majPlan,
  majVideo,
  usePlansBanque,
  useRafraichirBanque,
  useThemesBanque,
  useVideosBanque,
} from "@/hooks/useBanque";
import {
  analyserMotsCles,
  couvertureCategories,
  couvertureThemes,
  filtrerPlans,
  LIBELLE_STATUT_VIDEO,
  OBJECTIF_SECOURS,
  planUtilisable,
  SEUIL_THEME,
  verifierVideoBanque,
  type PlanBanque,
  type StatutVideo,
} from "@/lib/studio/banque";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const PAR_PAGE = 48;
type ChampsPlan = Partial<Pick<PlanBanque, "exclu" | "secours" | "mots_cles">>;

const COULEUR_STATUT: Record<StatutVideo, string> = {
  a_indexer: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  indexation: "border-sky-500/30 bg-sky-500/15 text-sky-300",
  indexee: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  erreur: "border-red-500/30 bg-red-500/15 text-red-300",
};

function Chiffre({ titre, valeur, detail, alerte }: { titre: string; valeur: string | number; detail?: string; alerte?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", alerte ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card")}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{valeur}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

function CartePlan({
  p,
  image,
  categorie,
  nomTheme,
  onChange,
}: {
  p: PlanBanque;
  image?: string;
  categorie?: string | null;
  nomTheme: (id: string) => string;
  onChange: (champs: ChampsPlan) => void;
}) {
  const [edition, setEdition] = useState<string | null>(null);
  const valider = () => {
    if (edition !== null) onChange({ mots_cles: analyserMotsCles(edition) });
    setEdition(null);
  };
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card", p.exclu ? "border-red-500/30 opacity-60" : "border-border")}>
      <div className="relative aspect-[9/16] bg-black">
        {image ? <img src={image} alt={p.description ?? ""} loading="lazy" className="h-full w-full object-cover" /> : null}
        <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {(p.fin - p.debut).toFixed(1).replace(".", ",")} s
        </span>
        {p.secours && (
          <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
            Secours
          </span>
        )}
        {(p.qualite && p.qualite !== "nette") || p.logo ? (
          <span className="absolute right-1 top-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] text-white">
            {p.logo ? "Logo" : p.qualite === "floue" ? "Flou" : "Sombre"}
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-2.5">
        <p className="line-clamp-3 text-xs text-foreground">{p.description}</p>
        <div className="flex flex-wrap gap-1">
          {categorie && <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-foreground">{categorie}</span>}
          {p.themes.map((t) => (
            <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
              {nomTheme(t)}
            </span>
          ))}
          {p.ambiance && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.ambiance}</span>}
        </div>
        {edition === null ? (
          <button
            type="button"
            onClick={() => setEdition(p.mots_cles.join(", "))}
            className="group flex w-full items-start gap-1 text-left"
            title="Corriger les mots-clés"
          >
            <span className="line-clamp-2 flex-1 text-[10px] text-muted-foreground">{p.mots_cles.join(" · ") || "Aucun mot-clé"}</span>
            <Pencil className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
          </button>
        ) : (
          <div className="flex gap-1">
            <Input
              autoFocus
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") valider();
                if (e.key === "Escape") setEdition(null);
              }}
              placeholder="billets, liasse, main…"
              className="h-7 px-2 text-[11px]"
              aria-label="Mots-clés, séparés par des virgules"
            />
            <Button size="icon" className="h-7 w-7 shrink-0" onClick={valider} aria-label="Enregistrer les mots-clés">
              <Check className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={p.exclu ? "default" : "outline"}
            className="h-7 flex-1 gap-1 px-2 text-[11px]"
            onClick={() => onChange({ exclu: !p.exclu })}
          >
            <Ban className="h-3 w-3" /> {p.exclu ? "Exclu" : "Exclure"}
          </Button>
          <Button
            size="sm"
            variant={p.secours ? "default" : "outline"}
            className="h-7 flex-1 gap-1 px-2 text-[11px]"
            onClick={() => onChange({ secours: !p.secours })}
            title="Plan de secours « ambiance AL BARAKA »"
          >
            <LifeBuoy className="h-3 w-3" /> Secours
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function StudioBanque() {
  const { data: videos, isLoading: chargeVideos } = useVideosBanque();
  const { data: plans, isLoading: chargePlans } = usePlansBanque();
  const { data: themes } = useThemesBanque();
  const rafraichir = useRafraichirBanque();
  const [envois, setEnvois] = useState<{ nom: string; pourcent: number; erreur?: string }[]>([]);
  const [lancement, setLancement] = useState(false);
  const [theme, setTheme] = useState<string | null>(null);
  const [categorie, setCategorie] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [voir, setVoir] = useState<"tous" | "utilisables" | "exclus" | "secours">("tous");
  const [page, setPage] = useState(1);
  const [images, setImages] = useState<Record<string, string>>({});
  const [local, setLocal] = useState<Record<string, Partial<PlanBanque>>>({});

  const tousPlans = useMemo(() => (plans ?? []).map((p) => ({ ...p, ...local[p.id] })), [plans, local]);
  const categories = useMemo(() => new Map((videos ?? []).map((v) => [v.id, v.dossier])), [videos]);
  const filtres = useMemo(
    () =>
      filtrerPlans(tousPlans, {
        theme,
        recherche,
        voir,
        categorie,
        categories,
      }),
    [tousPlans, theme, recherche, voir, categorie, categories],
  );
  const parCategorie = useMemo(() => couvertureCategories(videos ?? [], tousPlans), [videos, tousPlans]);
  const visibles = filtres.slice(0, page * PAR_PAGE);
  const couverture = useMemo(() => couvertureThemes(themes ?? [], tousPlans), [themes, tousPlans]);
  const nomTheme = (id: string) => themes?.find((t) => t.id === id)?.nom ?? id;
  const enAttente = (videos ?? []).filter((v) => !v.exclue && (v.statut === "a_indexer" || v.statut === "erreur")).length;
  const enCours = (videos ?? []).some((v) => v.statut === "indexation");
  const plansParVideo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of plans ?? []) m.set(p.video_id, (m.get(p.video_id) ?? 0) + 1);
    return m;
  }, [plans]);

  // images clés des plans affichés (image du milieu), chargées par page
  useEffect(() => {
    const manquants = visibles.map((p) => p.images[1] ?? p.images[0]).filter((c) => c && !images[c]);
    if (!manquants.length) return;
    liensBanque(manquants)
      .then((l) => setImages((avant) => ({ ...avant, ...l })))
      .catch(() => undefined);
  }, [visibles, images]);

  // fin d'une indexation : les plans arrivent
  useEffect(() => {
    if (!enCours) rafraichir();
  }, [enCours]); // eslint-disable-line react-hooks/exhaustive-deps

  async function importer(fichiers: FileList | null) {
    const liste = Array.from(fichiers ?? []);
    const refus = liste.map(verifierVideoBanque).filter(Boolean) as string[];
    if (refus.length)
      toast({
        title: "Vidéos refusées",
        description: refus.join(" "),
        variant: "destructive",
      });
    const ok = liste.filter((f) => !verifierVideoBanque(f));
    setEnvois(ok.map((f) => ({ nom: f.name, pourcent: 0 })));
    for (let i = 0; i < ok.length; i++) {
      try {
        await importerDansBanque(ok[i], (pourcent) => setEnvois((e) => e.map((x, k) => (k === i ? { ...x, pourcent } : x))));
      } catch (e) {
        setEnvois((liste) => liste.map((x, k) => (k === i ? { ...x, erreur: message(e) } : x)));
      }
    }
    rafraichir();
  }

  async function indexer() {
    setLancement(true);
    try {
      const r = await lancerIndexation();
      toast({
        title: r.videos ? `Indexation lancée : ${r.videos} vidéo${r.videos > 1 ? "s" : ""}` : "Rien à indexer",
        description: r.videos ? "Compte quelques minutes par vidéo. Tu peux fermer la page." : undefined,
      });
      rafraichir();
    } catch (e) {
      toast({
        title: "Indexation impossible",
        description: message(e),
        variant: "destructive",
      });
    } finally {
      setLancement(false);
    }
  }

  async function changerPlan(p: PlanBanque, champs: ChampsPlan) {
    setLocal((l) => ({ ...l, [p.id]: { ...l[p.id], ...champs } }));
    try {
      await majPlan(p.id, champs);
    } catch (e) {
      setLocal((l) => ({
        ...l,
        [p.id]: {
          ...l[p.id],
          ...Object.fromEntries(Object.keys(champs).map((k) => [k, p[k as "exclu"]])),
        },
      }));
      toast({
        title: "Modification impossible",
        description: message(e),
        variant: "destructive",
      });
    }
  }

  const utilisables = tousPlans.filter(planUtilisable).length;
  const secours = tousPlans.filter((p) => p.secours && !p.exclu).length;
  const themesEnManque = couverture.filter((t) => t.manque).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/studio">
            <ArrowLeft className="h-4 w-4" /> Studio
          </Link>
        </Button>
        <h1 className="font-heading text-2xl text-foreground">Banque de vidéos</h1>
        <span className="text-sm text-muted-foreground">Voix off</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Chiffre
          titre="Vidéos"
          valeur={videos?.length ?? "…"}
          detail={`${(videos ?? []).filter((v) => v.statut === "indexee").length} indexées`}
        />
        <Chiffre titre="Plans utilisables" valeur={chargePlans ? "…" : utilisables} detail={`sur ${tousPlans.length} plans`} />
        <Chiffre
          titre="Plans de secours"
          valeur={`${secours} / ${OBJECTIF_SECOURS}`}
          detail="« ambiance AL BARAKA »"
          alerte={secours < OBJECTIF_SECOURS}
        />
        <Chiffre titre="Thèmes à compléter" valeur={themesEnManque} detail={`moins de ${SEUIL_THEME} plans`} alerte={themesEnManque > 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border px-6 py-8 text-center transition-colors hover:border-primary/60"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            importer(e.dataTransfer.files);
          }}
        >
          <Upload className="h-8 w-8 text-primary" />
          <span className="text-sm font-semibold text-foreground">Ajouter des vidéos à la banque</span>
          <span className="text-xs text-muted-foreground">
            Glisse-les ici ou clique · MP4, MOV, WebM · 2 Go max chacune · plusieurs à la fois
          </span>
          <input
            type="file"
            multiple
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
            className="hidden"
            onChange={(e) => importer(e.target.files)}
            data-testid="banque-fichiers"
          />
        </label>
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Indexation</p>
            <p className="text-xs text-muted-foreground">
              Découpe chaque vidéo en plans, fait décrire chaque plan par l'IA et le rend cherchable « par le sens ».
            </p>
          </div>
          {enCours ? (
            <p className="flex items-center gap-2 text-sm text-sky-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Indexation en cours…
            </p>
          ) : (
            <Button onClick={indexer} disabled={lancement || enAttente === 0} className="gap-2">
              {lancement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {enAttente ? `Indexer ${enAttente} vidéo${enAttente > 1 ? "s" : ""}` : "Tout est indexé"}
            </Button>
          )}
        </div>
      </div>

      {envois.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-border p-3">
          {envois.map((e, k) => (
            <li key={k} className="flex items-center gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">{e.nom}</span>
              {e.erreur ? <span className="text-xs text-red-300">{e.erreur}</span> : <Progress value={e.pourcent} className="h-2 w-40" />}
            </li>
          ))}
        </ul>
      )}

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans ({tousPlans.length})</TabsTrigger>
          <TabsTrigger value="videos">Vidéos ({videos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="themes">Thèmes</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={recherche}
                onChange={(e) => {
                  setRecherche(e.target.value);
                  setPage(1);
                }}
                placeholder="Chercher (billets, mosquée, ordinateur…)"
                className="pl-8"
              />
            </div>
            <Select
              value={theme ?? "tous"}
              onValueChange={(v) => {
                setTheme(v === "tous" ? null : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les thèmes</SelectItem>
                {(themes ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categorie ?? "toutes"} onValueChange={(v) => setCategorie(v === "toutes" ? null : v)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les catégories</SelectItem>
                {parCategorie.map((c) => (
                  <SelectItem key={c.nom} value={c.nom}>
                    {c.nom} ({c.plans})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={voir} onValueChange={(v) => setVoir(v as typeof voir)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les plans</SelectItem>
                <SelectItem value="utilisables">Utilisables</SelectItem>
                <SelectItem value="exclus">Exclus</SelectItem>
                <SelectItem value="secours">Plans de secours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {chargePlans ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : filtres.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tousPlans.length ? "Aucun plan ne correspond." : "Aucun plan pour l'instant : ajoute des vidéos puis lance l'indexation."}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" data-testid="banque-plans">
                {visibles.map((p) => (
                  <CartePlan
                    key={p.id}
                    p={p}
                    image={images[p.images[1] ?? p.images[0]]}
                    categorie={categories.get(p.video_id)}
                    nomTheme={nomTheme}
                    onChange={(champs) => changerPlan(p, champs)}
                  />
                ))}
              </div>
              {visibles.length < filtres.length && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => setPage((n) => n + 1)}>
                    Voir plus ({filtres.length - visibles.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="videos">
          {chargeVideos ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {(videos ?? []).map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{v.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.duree ? `${Math.round(v.duree)} s · ` : ""}
                      {plansParVideo.get(v.id) ?? 0} plans
                      {v.dossier ? ` · ${v.dossier}` : ""}
                    </p>
                    {v.erreur && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-red-300">
                        <AlertTriangle className="h-3 w-3" /> {v.erreur}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={COULEUR_STATUT[v.statut]}>
                    {v.statut === "indexation" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {LIBELLE_STATUT_VIDEO[v.statut]}
                  </Badge>
                  {v.statut === "erreur" && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => lancerIndexation([v.id]).then(rafraichir)}>
                      <RefreshCw className="h-3 w-3" /> Réessayer
                    </Button>
                  )}
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    Exclue
                    <Switch
                      checked={v.exclue}
                      onCheckedChange={(exclue) => majVideo(v.id, { exclue }).then(rafraichir)}
                      aria-label={`Exclure ${v.nom}`}
                    />
                  </label>
                </div>
              ))}
              {(videos ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Aucune vidéo dans la banque.</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="themes" className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Plans utilisables par catégorie : les dossiers de la banque (classement de l'équipe). L'IA s'en sert comme indice.
            </p>
            <div className="space-y-1.5" data-testid="banque-categories">
              {parCategorie.map((c) => (
                <div key={c.nom} className="flex items-center gap-3 text-sm">
                  <span className="w-64 shrink-0 truncate text-foreground">{c.nom}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(100, (c.plans / Math.max(1, parCategorie[0]?.plans ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-muted-foreground">{c.plans}</span>
                </div>
              ))}
              {parCategorie.length === 0 && <p className="text-sm text-muted-foreground">Aucun plan indexé pour l'instant.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Plans utilisables par thème. Sous {SEUIL_THEME}, le thème manque de plans : c'est ce qu'il faut ajouter en priorité.
            </p>
            <div className="space-y-1.5">
              {couverture.map((t) => (
                <div key={t.id} className="flex items-center gap-3 text-sm">
                  <span className="w-64 shrink-0 truncate text-foreground">{t.nom}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", t.manque ? "bg-amber-500" : "bg-primary")}
                      style={{
                        width: `${Math.min(100, (t.plans / (SEUIL_THEME * 3)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className={cn("w-16 text-right tabular-nums", t.manque ? "text-amber-300" : "text-muted-foreground")}>
                    {t.plans}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
