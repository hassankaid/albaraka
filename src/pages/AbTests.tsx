// ─────────────────────────────────────────────────────────────────────────
// A/B testing des tunnels — création des tests et lecture des résultats.
//
// Une page à part, et pas un onglet du dashboard Marketing : celui-ci est une
// surface de LECTURE (on y compare des canaux, des mois, des conférences), là où
// l'A/B testing est une surface d'ACTION — on y ouvre un test, on le surveille,
// on le clôt. Mélanger un atelier dans un tableau de bord dégrade les deux.
//
// CE QUE MESURE UN TEST, en une phrase : parmi les visiteurs qui ont VU une
// variante, combien ont fait l'action suivante ?
//
// Un test dit OÙ il se joue, et l'action mesurée en découle :
//
//   Landing    vu à l'arrivée      → mesure l'INSCRIPTION
//   Merci      vu après inscription → mesure le groupe WhatsApp, ou le RDV
//
// Les deux tunnels partagent aujourd'hui la même landing — choix assumé. Un
// test de landing y comparera donc deux fois la même page et ne trouvera aucun
// écart : c'est le résultat attendu, et la preuve que l'instrument est juste.
// Ce qui manquait n'était pas le contenu mais la MESURE ; elle est en place, et
// le jour où une seconde version de la landing existe, il n'y a rien à ajouter.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy, FlaskConical, TrendingUp, AlertTriangle, Check } from "lucide-react";
import { VARIANTS } from "@/pages/tunnels/variants";
import { analyser, VISITEURS_MINIMUM, type ResultatBrut } from "@/lib/abtest";

type TunnelKey = "wa" | "vsl";

interface AbTest {
  id: string;
  code: string;
  libelle: string;
  tunnel: TunnelKey;
  canal: string | null;
  variants: string[];
  weights: number[];
  etape: "landing" | "merci";
  action: "groupe_whatsapp" | "rendez_vous" | "inscription";
  statut: "running" | "stopped";
  demarre_le: string;
  arrete_le: string | null;
  conclusion: string | null;
}

const LIB_TUNNEL: Record<TunnelKey, string> = { wa: "Tunnel WhatsApp", vsl: "Tunnel VSL" };
const LIB_CANAL: Record<string, string> = {
  ads: "Publicités Meta", ig: "Instagram organique",
  tiktok: "TikTok organique", youtube: "YouTube organique",
};
const LIB_ACTION: Record<string, string> = {
  groupe_whatsapp: "Rejoindre le groupe WhatsApp",
  rendez_vous: "Prendre rendez-vous",
  inscription: "S'inscrire",
};
const LIB_ETAPE: Record<AbTest["etape"], string> = {
  landing: "Landing (page d'arrivée)",
  merci: "Page de remerciement",
};

// L'action mesurée n'est pas un choix : c'est la première chose que le visiteur
// peut faire APRÈS avoir vu la variante. La proposer dans un menu inviterait à
// mesurer une étape que la variante ne peut pas influencer.
function actionDuTest(etape: AbTest["etape"], tunnel: TunnelKey): AbTest["action"] {
  if (etape === "landing") return "inscription";
  return tunnel === "vsl" ? "rendez_vous" : "groupe_whatsapp";
}
const BASE_TUNNEL: Record<TunnelKey, string> = {
  wa: "https://event.albarakaecosysteme.com/webinaire",
  vsl: "https://event.albarakaecosysteme.com/vsl",
};

/** Code lisible : ni O/0 ni I/1, il sera recopié à la main. */
function genererCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function lienDuTest(t: Pick<AbTest, "tunnel" | "canal" | "code">): string {
  const p = new URLSearchParams();
  if (t.canal) p.set("src", t.canal);
  p.set("ab", t.code);
  return `${BASE_TUNNEL[t.tunnel]}?${p.toString()}`;
}

const fmtPct = (v: number | null, d = 1) =>
  v === null || !Number.isFinite(v) ? "—" : `${v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d })} %`;

export default function AbTests() {
  const { profile } = useAuth();
  const autorise = profile?.role === "ceo" || profile?.role === "agence";
  const qc = useQueryClient();

  const { data: tests, isLoading } = useQuery({
    queryKey: ["ab-tests"],
    enabled: autorise,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_tests")
        .select("*")
        .order("demarre_le", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AbTest[];
    },
  });

  const arreter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ab_tests")
        .update({ statut: "stopped", arrete_le: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test clos. Ses résultats sont figés.");
      void qc.invalidateQueries({ queryKey: ["ab-tests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Impossible de clore le test"),
  });

  // La garde de rôle est ICI, pas seulement dans le menu : les routes du
  // dashboard ne sont pas gardées individuellement, une URL tapée à la main
  // suffirait à ouvrir la page.
  if (!autorise) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Cette page est réservée à la direction et à l'agence.</p>
      </div>
    );
  }

  const enCours = (tests ?? []).filter((t) => t.statut === "running");
  const termines = (tests ?? []).filter((t) => t.statut === "stopped");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold flex items-center gap-2">
          <FlaskConical className="size-6 text-primary" /> A/B Testing
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Un test partage le trafic entre deux variantes et compte, pour chacune, ce que
          font les visiteurs ensuite. Sur la <strong>landing</strong>, la mesure est
          l'inscription ; sur la <strong>page de remerciement</strong>, c'est le groupe
          WhatsApp ou le rendez-vous. Un visiteur voit toujours la même variante, même
          s'il revient.
        </p>
      </div>

      <NouveauTest onCree={() => qc.invalidateQueries({ queryKey: ["ab-tests"] })} />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="font-heading text-xl font-semibold">Tests en cours</h2>
            {enCours.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun test en cours.</p>
            ) : (
              enCours.map((t) => (
                <CarteTest key={t.id} test={t} onArreter={() => arreter.mutate(t.id)} />
              ))
            )}
          </section>

          {termines.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">Tests terminés</h2>
              <p className="text-sm text-muted-foreground">
                Ce que vous avez déjà appris. Cette archive vaut souvent plus que le test du jour.
              </p>
              {termines.map((t) => <CarteTest key={t.id} test={t} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ═══ Le générateur ═══════════════════════════════════════════════════════

function NouveauTest({ onCree }: { onCree: () => void }) {
  const { profile } = useAuth();
  const [tunnel, setTunnel] = useState<TunnelKey>("wa");
  const [etape, setEtape] = useState<AbTest["etape"]>("merci");
  const [canal, setCanal] = useState<string>("tous");
  const [libelle, setLibelle] = useState("");
  const [choisies, setChoisies] = useState<string[]>([]);

  const disponibles = VARIANTS[tunnel];

  const creer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ab_tests").insert({
        code: genererCode(),
        libelle: libelle.trim() || `${LIB_TUNNEL[tunnel]} — ${choisies.join(" contre ")}`,
        tunnel,
        canal: canal === "tous" ? null : canal,
        variants: choisies,
        weights: choisies.map(() => 1), // réparti à parts égales
        etape,
        action: actionDuTest(etape, tunnel),
        cree_par: profile?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Test ouvert. Le lien est prêt à être diffusé.");
      setChoisies([]); setLibelle("");
      onCree();
    },
    onError: (e: any) => toast.error(e?.message ?? "Création impossible"),
  });

  const basculer = (cle: string) =>
    setChoisies((c) => (c.includes(cle) ? c.filter((x) => x !== cle) : [...c, cle]));

  // Deux variantes, pas six. Avec 40 à 100 inscrits par tunnel et par semaine,
  // six variantes donneraient une dizaine de visiteurs chacune : on ne
  // mesurerait que du bruit.
  const trop = choisies.length > 2;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-xl font-semibold">Ouvrir un test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Où se joue le test</Label>
            <Select value={etape} onValueChange={(v) => setEtape(v as AbTest["etape"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landing">Landing (page d'arrivée)</SelectItem>
                <SelectItem value="merci">Page de remerciement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tunnel</Label>
            <Select value={tunnel} onValueChange={(v) => { setTunnel(v as TunnelKey); setChoisies([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="wa">Tunnel WhatsApp</SelectItem>
                <SelectItem value="vsl">Tunnel VSL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Origine du trafic</Label>
            <Select value={canal} onValueChange={setCanal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes origines</SelectItem>
                {Object.entries(LIB_CANAL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nom du test</Label>
            <Input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Facultatif" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Variantes à opposer</Label>
          <div className="flex flex-wrap gap-2">
            {disponibles.map((v) => {
              const active = choisies.includes(v.key);
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => basculer(v.key)}
                  className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                    active ? "gold-border bg-primary/10 text-primary font-medium" : "border-border hover:bg-secondary/50"
                  }`}
                >
                  {active && <Check className="size-3.5 inline mr-1.5" />}
                  {v.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            La première sélectionnée sert de <strong>référence</strong> — c'est l'existant, celui qu'on cherche à battre.
          </p>
        </div>

        <p className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
          <strong>Ce test mesurera :</strong> {LIB_ACTION[actionDuTest(etape, tunnel)].toLowerCase()}.
          {etape === "landing"
            ? " C'est la première chose que le visiteur peut faire après être arrivé."
            : " C'est la seule étape que la vidéo peut influencer — elle est vue juste avant."}
          {etape === "landing" && (
            <>
              {" "}Attention : la landing est aujourd'hui <strong>identique</strong> pour toutes les
              variantes. Un test ouvert maintenant comparera deux fois la même page et ne trouvera,
              à raison, aucun écart. Il devient utile dès qu'une seconde version existe.
            </>
          )}
        </p>

        {trop && (
          <p className="text-xs text-orange-600 flex items-start gap-1.5">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            <span>
              Plus de deux variantes à la fois, c'est trop pour vos volumes : 40 à 100 inscrits
              par tunnel et par semaine donneraient une dizaine de visiteurs par variante. Vous ne
              mesureriez que du bruit. Testez-en deux, pendant trois à cinq semaines.
            </span>
          </p>
        )}

        <Button
          onClick={() => creer.mutate()}
          disabled={choisies.length < 2 || trop || creer.isPending}
        >
          Ouvrir le test et générer le lien
        </Button>
      </CardContent>
    </Card>
  );
}

// ═══ Une carte de test, avec ses résultats ═══════════════════════════════

function CarteTest({ test, onArreter }: { test: AbTest; onArreter?: () => void }) {
  const lien = lienDuTest(test);

  const { data: bruts, isLoading } = useQuery({
    queryKey: ["ab-resultats", test.code],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("ab_test_resultats", { p_code: test.code });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        variant: String(r.variant),
        poids: Number(r.poids),
        visiteurs: Number(r.visiteurs),
        conversions: Number(r.conversions),
        ventes: Number(r.ventes),
        ca: Number(r.ca),
      })) as ResultatBrut[];
    },
  });

  const analyse = useMemo(() => (bruts && bruts.length ? analyser(bruts) : null), [bruts]);
  const libVariante = (cle: string) =>
    VARIANTS[test.tunnel].find((v) => v.key === cle)?.label ?? `Variante ${cle}`;

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="font-heading text-lg font-semibold flex items-center gap-2 flex-wrap">
            {test.libelle}
            <Badge variant="outline" className="font-mono">{test.code}</Badge>
            {test.statut === "stopped" && <Badge variant="secondary">Terminé</Badge>}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {LIB_TUNNEL[test.tunnel]} · {LIB_ETAPE[test.etape ?? "merci"].toLowerCase()} ·{" "}
            {test.canal ? LIB_CANAL[test.canal] : "toutes origines"} ·
            mesure : {LIB_ACTION[test.action].toLowerCase()} ·
            depuis le {new Date(test.demarre_le).toLocaleDateString("fr-FR")}
          </p>
        </div>
        {onArreter && (
          <Button variant="outline" size="sm" onClick={onArreter}>Clore</Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {test.statut === "running" && (
          <div className="flex items-center gap-2 rounded-lg border bg-secondary/30 p-2">
            <code className="text-xs flex-1 truncate">{lien}</code>
            <Button
              variant="ghost" size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(lien);
                toast.success("Lien copié");
              }}
            >
              <Copy className="size-3.5 mr-1.5" /> Copier
            </Button>
          </div>
        )}

        {isLoading || !analyse ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            {!analyse.repartition.conforme && (
              <p className="text-sm rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 flex items-start gap-2">
                <AlertTriangle className="size-4 mt-0.5 shrink-0 text-orange-600" />
                <span>
                  <strong>Répartition anormale.</strong> Le trafic ne se partage pas comme prévu
                  ({analyse.repartition.observe.join(" / ")} au lieu de{" "}
                  {analyse.repartition.attendu.map((e) => Math.round(e)).join(" / ")}). Sur ce
                  volume, ce n'est pas de la chance : cherchez une redirection, un bot, ou une
                  variante cassée. <strong>Ne tirez aucune conclusion de ce test</strong> avant
                  d'avoir trouvé.
                </span>
              </p>
            )}

            <div className="rounded-lg border overflow-x-auto">
              <table className="w-full text-sm min-w-[620px]">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="text-left font-medium p-2.5">Variante</th>
                    <th className="text-right font-medium p-2.5">
                      {test.etape === "landing" ? "Visiteurs" : "Exposés"}
                    </th>
                    <th className="text-right font-medium p-2.5">
                      {test.etape === "landing" ? "Inscrits" : "Actions"}
                    </th>
                    <th className="text-right font-medium p-2.5">Taux</th>
                    <th className="text-right font-medium p-2.5">vs référence</th>
                    <th className="text-right font-medium p-2.5">Ventes</th>
                  </tr>
                </thead>
                <tbody>
                  {analyse.variantes.map((v) => {
                    const gagnante = analyse.verdict.type === "gagnante" && analyse.verdict.variant === v.variant;
                    return (
                      <tr key={v.variant} className={`border-b last:border-0 ${gagnante ? "bg-primary/[0.04]" : ""}`}>
                        <td className="p-2.5">
                          <span className={gagnante ? "font-medium text-primary" : undefined}>
                            {libVariante(v.variant)}
                          </span>
                          {v.variant === analyse.reference && (
                            <span className="text-xs text-muted-foreground ml-2">référence</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right tabular-nums">{v.visiteurs}</td>
                        <td className="p-2.5 text-right tabular-nums">{v.conversions}</td>
                        <td className="p-2.5 text-right tabular-nums font-medium">{fmtPct(v.tauxConversion)}</td>
                        <td className="p-2.5 text-right tabular-nums text-xs">
                          {v.versusReference ? (
                            <span className={v.versusReference.significatif
                              ? (v.versusReference.lift > 0 ? "text-emerald-600" : "text-orange-600")
                              : "text-muted-foreground"}>
                              {v.versusReference.lift > 0 ? "+" : ""}
                              {v.versusReference.lift.toFixed(0)} %
                              {!v.versusReference.significatif && " (non concluant)"}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="p-2.5 text-right tabular-nums text-muted-foreground">{v.ventes}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Verdict analyse={analyse} libVariante={libVariante} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Verdict({ analyse, libVariante }: { analyse: ReturnType<typeof analyser>; libVariante: (c: string) => string }) {
  const v = analyse.verdict;

  if (v.type === "pas_assez") {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
        <strong>Trop tôt pour conclure.</strong> {v.message} Il faut au moins {VISITEURS_MINIMUM} visiteurs
        par variante — regarder plus tôt et s'arrêter au premier écart fabrique des gagnants imaginaires,
        parce qu'un écart finit toujours par apparaître si on regarde assez souvent.
      </p>
    );
  }

  if (v.type === "aucun_ecart") {
    return (
      <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3">
        <strong>Aucune variante ne se détache.</strong> {v.message}
      </p>
    );
  }

  return (
    <p className="text-sm rounded-lg gold-border bg-primary/[0.06] p-3 flex items-start gap-2">
      <TrendingUp className="size-4 mt-0.5 shrink-0 text-primary" />
      <span>
        <strong className="text-primary">{libVariante(v.variant)} l'emporte</strong> avec{" "}
        {v.lift > 0 ? "+" : ""}{v.lift.toFixed(0)} % par rapport à la référence
        (p = {v.pValeur < 0.001 ? "< 0,001" : v.pValeur.toFixed(3)}).
        {" "}Avant de basculer, vérifiez la colonne Ventes : une variante peut faire venir plus de
        monde et amener des gens qui achètent moins.
      </span>
    </p>
  );
}
