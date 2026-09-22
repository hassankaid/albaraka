// ─────────────────────────────────────────────────────────────────────────
// Questionnaire clients — tableau de bord (phase 2 du cahier des charges).
//
// Réservé aux administrateurs : les deux tables n'ont de politique de lecture
// que pour eux, donc un autre rôle ne verrait rien même en forçant l'URL.
//
// Tout est chargé en une fois — 322 réponses au maximum — et filtré dans le
// navigateur. Les filtres se combinent donc instantanément, ce qui change la
// façon de s'en servir : on croise, on revient, on recroise.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, RefreshCw, Search, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { SECTIONS } from "@/pages/public/questionnaire/questions";
import {
  filtrer, moyenne, nps, part, repartition, repartitionMultiple, croiser,
  normaliserPays, versCSV, LIBRES, FILTRES_VIDES,
  type Reponse, type Filtres, type Tranche,
} from "./stats";

const OR = "#C9A04E";

/** L'ordre des options, lu depuis le questionnaire lui-même. */
function optionsDe(id: string): string[] | undefined {
  for (const s of SECTIONS) {
    const q = s.questions.find((x) => x.id === id);
    if (q?.options) return q.options;
  }
  return undefined;
}

const THEMES: { titre: string; blocs: { champ: keyof Reponse; titre: string; multiple?: boolean }[] }[] = [
  { titre: "Avatar client", blocs: [
    { champ: "q1", titre: "Âge" }, { champ: "q2", titre: "Pays" },
    { champ: "q3", titre: "Situation familiale" }, { champ: "q4", titre: "Niveau d'études" }] },
  { titre: "Situation professionnelle et finances", blocs: [
    { champ: "q5", titre: "Situation actuelle" }, { champ: "q7", titre: "Revenu mensuel" },
    { champ: "q8", titre: "Expérience préalable" }, { champ: "q9", titre: "Temps disponible / semaine" }] },
  { titre: "Acquisition", blocs: [
    { champ: "q12", titre: "Canal d'acquisition" },
    { champ: "q13", titre: "Délai de maturation avant l'achat" }] },
  { titre: "Motivations", blocs: [{ champ: "q14", titre: "Objectif principal" }] },
  { titre: "Progression et blocages", blocs: [
    { champ: "q11", titre: "Ancienneté dans le programme" },
    { champ: "q19", titre: "A pensé à abandonner" },
    { champ: "q21", titre: "Formation terminée" }] },
  { titre: "Satisfaction", blocs: [{ champ: "q27", titre: "Formats qui aident le plus", multiple: true }] },
];

const DIMENSIONS: { champ: keyof Reponse; libelle: string }[] = [
  { champ: "q1", libelle: "Âge" },
  { champ: "q5", libelle: "Situation professionnelle" },
  { champ: "q7", libelle: "Revenu mensuel" },
  { champ: "q12", libelle: "Canal d'acquisition" },
  { champ: "q10", libelle: "Formation" },
  { champ: "q9", libelle: "Temps disponible" },
  { champ: "q2", libelle: "Pays" },
];

export default function AdminQuestionnaire() {
  const [reponses, setReponses] = useState<Reponse[]>([]);
  const [avancement, setAvancement] = useState<{ envoyes: number; repondus: number; cliques_sans_reponse: number; exclus: number } | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_VIDES);
  const [dimension, setDimension] = useState<keyof Reponse>("q1");
  const [recherche, setRecherche] = useState("");
  const [fiche, setFiche] = useState<Reponse | null>(null);

  const charger = async () => {
    setChargement(true);
    setErreur(null);
    const [res, av] = await Promise.all([
      supabase.from("questionnaire_resultats" as never).select("*").order("soumis_le", { ascending: false }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.rpc("questionnaire_avancement" as any),
    ]);
    if (res.error) setErreur(res.error.message);
    else setReponses((res.data ?? []) as unknown as Reponse[]);
    if (!av.error && Array.isArray(av.data)) setAvancement(av.data[0] ?? null);
    setChargement(false);
  };

  useEffect(() => { void charger(); }, []);

  const vues = useMemo(() => filtrer(reponses, filtres), [reponses, filtres]);

  const paysConnus = useMemo(
    () => [...new Set(reponses.map((r) => normaliserPays(r.q2)))].sort(),
    [reponses],
  );

  const tauxReponse = avancement && avancement.envoyes > 0
    ? Math.round((avancement.repondus / avancement.envoyes) * 100) : null;

  const exporter = () => {
    const blob = new Blob([versCSV(vues)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `questionnaire-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filtreActif = JSON.stringify(filtres) !== JSON.stringify(FILTRES_VIDES);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Questionnaire client</h1>
          <p className="text-sm text-muted-foreground">
            {chargement ? "Chargement…" : `${vues.length} réponse${vues.length > 1 ? "s" : ""}`}
            {filtreActif && !chargement && ` sur ${reponses.length} au total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void charger()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Actualiser
          </Button>
          <Button size="sm" onClick={exporter} disabled={vues.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Exporter en CSV
          </Button>
        </div>
      </div>

      {erreur && (
        <Card><CardContent className="p-4 text-sm text-destructive">{erreur}</CardContent></Card>
      )}

      {/* ── Indicateurs clés ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Indicateur titre="Réponses" valeur={avancement ? String(avancement.repondus) : "—"}
          detail={avancement ? `sur ${avancement.envoyes} envoyés` : undefined} />
        <Indicateur titre="Taux de réponse" valeur={tauxReponse == null ? "—" : `${tauxReponse} %`}
          detail={avancement ? `${avancement.cliques_sans_reponse} ouvert sans finir` : undefined} />
        <Indicateur titre="NPS" valeur={nps(vues) == null ? "—" : String(nps(vues))}
          detail="promoteurs − détracteurs" />
        <Indicateur titre="Satisfaction" valeur={fmt(moyenne(vues, "q17"))} detail="progression · sur 10" />
        <Indicateur titre="Ont pensé à arrêter"
          valeur={pct(part(vues, (r) => r.q19 != null && r.q19 !== "Jamais"))} detail="hors « Jamais »" />
        <Indicateur titre="Formation terminée"
          valeur={pct(part(vues, (r) => r.q21 === "Oui"))} detail="déclaratif" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicateur titre="Qualité du contenu" valeur={fmt(moyenne(vues, "q24"))} detail="sur 10" />
        <Indicateur titre="Suivi et accompagnement" valeur={fmt(moyenne(vues, "q25"))} detail="sur 10" />
        <Indicateur titre="Recommandation" valeur={fmt(moyenne(vues, "q26"))} detail="sur 10 · base du NPS" />
      </div>

      {/* ── Filtres ── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <Filtre libelle="Formation" valeur={filtres.formation}
            options={optionsDe("q10") ?? []}
            onChange={(v) => setFiltres({ ...filtres, formation: v })} />
          <Filtre libelle="Ancienneté" valeur={filtres.anciennete}
            options={optionsDe("q11") ?? []}
            onChange={(v) => setFiltres({ ...filtres, anciennete: v })} />
          <Filtre libelle="Terminée" valeur={filtres.termine} options={["Oui", "Non"]}
            onChange={(v) => setFiltres({ ...filtres, termine: v })} />
          <Filtre libelle="Âge" valeur={filtres.age} options={optionsDe("q1") ?? []}
            onChange={(v) => setFiltres({ ...filtres, age: v })} />
          <Filtre libelle="Pays" valeur={filtres.pays} options={paysConnus}
            onChange={(v) => setFiltres({ ...filtres, pays: v })} />
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Du</label>
            <Input type="date" value={filtres.du} className="h-9 w-[150px]"
              onChange={(e) => setFiltres({ ...filtres, du: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Au</label>
            <Input type="date" value={filtres.au} className="h-9 w-[150px]"
              onChange={(e) => setFiltres({ ...filtres, au: e.target.value })} />
          </div>
          {filtreActif && (
            <Button variant="ghost" size="sm" onClick={() => setFiltres(FILTRES_VIDES)}>
              Tout effacer
            </Button>
          )}
        </CardContent>
      </Card>

      {vues.length === 0 && !chargement ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {reponses.length === 0
              ? "Aucune réponse pour l'instant. Les graphiques se rempliront au fil des retours."
              : "Aucune réponse ne correspond à ces filtres."}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Visuels par thème ── */}
          {THEMES.map((t) => (
            <section key={t.titre} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.titre}
              </h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {t.blocs.map((b) => (
                  <Graphique
                    key={String(b.champ)}
                    titre={b.titre}
                    donnees={b.multiple
                      ? repartitionMultiple(vues, optionsDe(String(b.champ)))
                      : repartition(vues, b.champ, optionsDe(String(b.champ)))}
                  />
                ))}
              </div>
            </section>
          ))}

          {/* ── Croisements ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Croisements
              </h2>
              <Select value={String(dimension)} onValueChange={(v) => setDimension(v as keyof Reponse)}>
                <SelectTrigger className="h-9 w-[240px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIMENSIONS.map((d) => (
                    <SelectItem key={String(d.champ)} value={String(d.champ)}>{d.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="p-3 text-left">
                        {DIMENSIONS.find((d) => d.champ === dimension)?.libelle}
                      </th>
                      <th className="p-3 text-right">Réponses</th>
                      <th className="p-3 text-right">Satisfaction</th>
                      <th className="p-3 text-right">Contenu</th>
                      <th className="p-3 text-right">Terminée</th>
                      <th className="p-3 text-right">Ont pensé à arrêter</th>
                      <th className="p-3 text-right">NPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {croiser(vues, dimension).map((l) => (
                      <tr key={l.valeur} className="border-b last:border-0">
                        <td className="p-3">{l.valeur}</td>
                        <td className="p-3 text-right tabular-nums">{l.n}</td>
                        <td className="p-3 text-right tabular-nums">{fmt(l.satisfaction)}</td>
                        <td className="p-3 text-right tabular-nums">{fmt(l.contenu)}</td>
                        <td className="p-3 text-right tabular-nums">{pct(l.termine)}</td>
                        <td className="p-3 text-right tabular-nums">{pct(l.abandon)}</td>
                        <td className="p-3 text-right tabular-nums">{l.nps == null ? "—" : l.nps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Une ligne par valeur. Les groupes de moins de cinq réponses se lisent avec prudence :
              un seul avis y déplace la moyenne.
            </p>
          </section>

          {/* ── Réponses libres ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Réponses libres
              </h2>
              <div className="relative w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="h-9 pl-9" placeholder="Rechercher un mot…"
                  value={recherche} onChange={(e) => setRecherche(e.target.value)} />
              </div>
            </div>
            {LIBRES.map((l) => (
              <BlocLibre key={String(l.champ)} titre={`${l.numero}. ${l.titre}`} enAvant={l.enAvant}
                reponses={vues} champ={l.champ} recherche={recherche} onOuvrir={setFiche} />
            ))}
          </section>
        </>
      )}

      {/* ── Fiche d'un répondant ── */}
      <Dialog open={fiche != null} onOpenChange={(o) => !o && setFiche(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{fiche?.nom_complet ?? fiche?.prenom ?? "Répondant"}</DialogTitle>
          </DialogHeader>
          {fiche && (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">
                Répondu le {new Date(fiche.soumis_le).toLocaleString("fr-FR")}
              </p>
              {SECTIONS.flatMap((s) => s.questions).map((q) => {
                const v = fiche[q.id as keyof Reponse];
                if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
                return (
                  <div key={q.id} className="border-b pb-2 last:border-0">
                    <div className="text-xs text-muted-foreground">{q.numero}. {q.titre}</div>
                    <div className="whitespace-pre-wrap">{Array.isArray(v) ? v.join(", ") : String(v)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Morceaux ────────────────────────────────────────────────────────────

const fmt = (v: number | null) => (v == null ? "—" : v.toFixed(1).replace(".", ","));
const pct = (v: number | null) => (v == null ? "—" : `${v} %`);

function Indicateur({ titre, valeur, detail }: { titre: string; valeur: string; detail?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{titre}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{valeur}</div>
        {detail && <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>}
      </CardContent>
    </Card>
  );
}

function Filtre({ libelle, valeur, options, onChange }: {
  libelle: string; valeur: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{libelle}</label>
      <Select value={valeur} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[190px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="tous">Tous</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Graphique({ titre, donnees }: { titre: string; donnees: Tranche[] }) {
  // Une barre horizontale par valeur : les libellés du questionnaire sont
  // longs (« Salarié en CDD / intérim »), ils seraient illisibles à la
  // verticale. La hauteur suit le nombre de barres.
  const hauteur = Math.max(140, donnees.length * 34 + 20);
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 text-sm font-medium">{titre}</div>
        <ResponsiveContainer width="100%" height={hauteur}>
          <BarChart data={donnees} layout="vertical" margin={{ left: 8, right: 34 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="valeur" width={170} tick={{ fontSize: 11 }}
              axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(201,160,78,0.08)" }}
              formatter={(v: number, _n, p: { payload?: Tranche }) =>
                [`${v} réponse${v > 1 ? "s" : ""} · ${p.payload?.pct ?? 0} %`, ""]}
            />
            <Bar dataKey="n" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11 }}>
              {donnees.map((d) => <Cell key={d.valeur} fill={OR} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function BlocLibre({ titre, enAvant, reponses, champ, recherche, onOuvrir }: {
  titre: string; enAvant?: boolean; reponses: Reponse[];
  champ: keyof Reponse; recherche: string; onOuvrir: (r: Reponse) => void;
}) {
  const [tout, setTout] = useState(false);
  const q = recherche.trim().toLowerCase();
  const lignes = reponses.filter((r) => {
    const v = r[champ];
    if (typeof v !== "string" || v.trim() === "") return false;
    return q === "" || v.toLowerCase().includes(q);
  });
  if (lignes.length === 0) return null;
  const visibles = tout ? lignes : lignes.slice(0, 8);

  return (
    <Card className={enAvant ? "border-[#C9A04E]/40" : undefined}>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-medium">{titre}</span>
          {enAvant && <Badge variant="outline" className="text-[10px]">à lire en priorité</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {lignes.length} réponse{lignes.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="space-y-2">
          {visibles.map((r) => (
            <button
              key={r.invitation_id}
              onClick={() => onOuvrir(r)}
              className="flex w-full gap-3 rounded-md border p-3 text-left text-sm hover:bg-muted/40"
            >
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="text-xs text-muted-foreground">{r.nom_complet ?? r.prenom ?? "—"} · </span>
                <span className="whitespace-pre-wrap">{String(r[champ])}</span>
              </span>
            </button>
          ))}
        </div>
        {lignes.length > 8 && (
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setTout(!tout)}>
            {tout ? "Réduire" : `Voir les ${lignes.length} réponses`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
