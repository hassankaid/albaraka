// Grille du lead scoring et réglages, côté CEO (cahier des charges de Sidali, 28/10/2026).
//
// On ne modifie jamais une grille : on publie une nouvelle version, datée, qui devient
// la grille active et recalcule toutes les réponses (scoring_grille_publier). Avant de
// publier, la simulation montre la répartition A/B/C/D qu'aurait donnée la nouvelle
// grille sur les réponses du tunnel (les saisies des setters restent à part).
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useScoringReglages } from "@/hooks/useScoringReglages";
import { meilleurProfil, PRIORITE_BADGES, QUIZ_QUESTIONS, repartition, type PointsGrille as Points, type Priorite } from "@/lib/leadScoring";
import { formatDateTime } from "@/lib/formatDate";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Grille {
  version: number;
  points: Points;
  seuil_a: number;
  seuil_b: number;
  seuil_c: number;
  active: boolean;
  note: string | null;
  created_at: string;
}

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function GrilleScoring() {
  const qc = useQueryClient();
  const { data: grilles = [], isLoading } = useQuery({
    queryKey: ["scoring-grilles"],
    queryFn: async (): Promise<Grille[]> => {
      const { data, error } = await db.from("scoring_grilles").select("*").order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: reponses = [] } = useQuery({
    queryKey: ["scoring-reponses-tunnel"],
    queryFn: async (): Promise<Record<string, string>[]> => {
      // Par tranches de 1 000 : au-delà, la base tronque la réponse.
      const toutes: Record<string, string>[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("lead_scoring_responses").select("answers").is("saisi_par", null).order("id").range(from, from + 999);
        if (error) throw error;
        toutes.push(...(data ?? []).map((r: { answers: Record<string, string> }) => r.answers));
        if (!data || data.length < 1000) return toutes;
      }
    },
  });
  const active = grilles.find((g) => g.active);

  const [points, setPoints] = useState<Points>({});
  const [seuils, setSeuils] = useState<[number, number, number]>([76, 62, 48]);
  const [note, setNote] = useState("");
  const [confirmer, setConfirmer] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  const reinitialiser = () => {
    if (!active) return;
    setPoints(JSON.parse(JSON.stringify(active.points)));
    setSeuils([active.seuil_a, active.seuil_b, active.seuil_c]);
    setNote("");
  };
  useEffect(reinitialiser, [active?.version]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = meilleurProfil(points);
  const modifiee = !!active && (JSON.stringify(points) !== JSON.stringify(active.points) || seuils.join() !== [active.seuil_a, active.seuil_b, active.seuil_c].join());
  const seuilsOk = seuils[0] > seuils[1] && seuils[1] > seuils[2] && seuils[2] > 0 && seuils[0] <= 100;
  const avant = useMemo(() => (active ? repartition(reponses, active.points, [active.seuil_a, active.seuil_b, active.seuil_c]) : null), [reponses, active]);
  const apres = useMemo(() => repartition(reponses, points, seuils), [reponses, points, seuils]);

  async function publier() {
    setEnvoi(true);
    const { data, error } = await db.rpc("scoring_grille_publier", {
      p_points: points, p_seuil_a: seuils[0], p_seuil_b: seuils[1], p_seuil_c: seuils[2], p_note: note,
    });
    setEnvoi(false);
    setConfirmer(false);
    if (error) { toast.error(error.message.replace(/^[a-z_]+: /, "")); return; }
    toast.success(`Version ${data} publiée : toutes les réponses sont recalculées`);
    qc.invalidateQueries({ queryKey: ["scoring-grilles"] });
  }

  if (isLoading || !active) return <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Grille de points <Badge variant="secondary">version {active.version} active</Badge>
          </CardTitle>
          <CardDescription>
            Combien de points rapporte chaque réponse du questionnaire. Le meilleur profil doit faire exactement 100 points.
            Modifie, regarde la simulation, puis publie : la nouvelle version s'applique à tous les leads, sans redéploiement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {QUIZ_QUESTIONS.map((q) => {
              const opts = points[q.id] ?? {};
              return (
                <div key={q.id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">{q.title}</span>
                    <span className="text-xs text-muted-foreground">max {Math.max(0, ...Object.values(opts))} pts</span>
                  </div>
                  <div className="space-y-1.5">
                    {q.options.map((o) => (
                      <div key={o.code} className="flex items-center gap-2">
                        <span className="flex-1 truncate text-xs" title={o.label}>{o.label}</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={opts[o.code] ?? 0}
                          onChange={(e) => setPoints((p) => ({ ...p, [q.id]: { ...p[q.id], [o.code]: Math.max(0, Math.min(100, Math.round(Number(e.target.value) || 0))) } }))}
                          className="h-7 w-16 text-right text-xs"
                          aria-label={`${q.title} — ${o.label}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-end gap-4 rounded-lg border p-3">
            {(["A", "B", "C"] as const).map((p, i) => (
              <div key={p} className="space-y-1">
                <Label className="text-xs">Priorité {p} à partir de</Label>
                <Input
                  type="number"
                  value={seuils[i]}
                  onChange={(e) => setSeuils((s) => s.map((v, j) => (j === i ? Math.round(Number(e.target.value) || 0) : v)) as [number, number, number])}
                  className="h-8 w-20"
                />
              </div>
            ))}
            <p className="pb-1 text-xs text-muted-foreground">En dessous de {seuils[2]} : priorité D.</p>
            <p className={`ml-auto pb-1 text-sm font-semibold ${max === 100 ? "text-emerald-500" : "text-red-500"}`}>Meilleur profil : {max} / 100</p>
          </div>

          {avant && (
            <div className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-semibold">Simulation sur les {reponses.length} réponses du tunnel</p>
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <span />
                {(["A", "B", "C", "D"] as Priorite[]).map((p) => (
                  <span key={p} className={`rounded border px-1 py-0.5 font-semibold ${PRIORITE_BADGES[p]}`}>{p}</span>
                ))}
                <span className="text-left text-muted-foreground">Grille actuelle</span>
                {(["A", "B", "C", "D"] as Priorite[]).map((p) => <span key={p}>{avant[p]}</span>)}
                <span className="text-left font-medium">Avec tes changements</span>
                {(["A", "B", "C", "D"] as Priorite[]).map((p) => (
                  <span key={p} className={apres[p] !== avant[p] ? "font-bold" : ""}>{apres[p]}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1 space-y-1">
              <Label className="text-xs">Pourquoi ce changement (gardé dans l'historique)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : revue après 4 conférences" />
            </div>
            <Button variant="ghost" onClick={reinitialiser} disabled={!modifiee} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Annuler mes changements
            </Button>
            <Button onClick={() => setConfirmer(true)} disabled={!modifiee || max !== 100 || !seuilsOk} className="gap-2" data-testid="publier-grille">
              <Upload className="h-4 w-4" /> Publier la version {Math.max(...grilles.map((g) => g.version)) + 1}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Reglages />

      <Card>
        <CardHeader>
          <CardTitle>Historique des versions</CardTitle>
          <CardDescription>Chaque score enregistre la version de grille utilisée, pour comparer deux périodes à grille égale.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {grilles.map((g) => (
            <div key={g.version} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="font-semibold">Version {g.version}</span>
              {g.active && <Badge>active</Badge>}
              <span className="text-xs text-muted-foreground">{formatDateTime(g.created_at, "Europe/Paris")}</span>
              <span className="text-xs text-muted-foreground">seuils {g.seuil_a} / {g.seuil_b} / {g.seuil_c}</span>
              <span className="text-xs">{g.note}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={confirmer} onOpenChange={setConfirmer}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier une nouvelle grille ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle remplace la version {active.version} pour tous les leads : les priorités de la page Leads et du rapport sont
              recalculées tout de suite. La version {active.version} reste dans l'historique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={publier} disabled={envoi}>
              {envoi && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Reglages() {
  const qc = useQueryClient();
  const { data } = useScoringReglages();
  const [jours, setJours] = useState<number[]>([4, 5]);
  const [tri, setTri] = useState(false);
  useEffect(() => {
    if (data) { setJours(data.jours_jeu_ven); setTri(data.jeu_ven_tri); }
  }, [data]);

  async function enregistrer() {
    const { error } = await db.rpc("scoring_reglages_modifier", { p_jours_jeu_ven: [...jours].sort(), p_jeu_ven_tri: tri });
    if (error) { toast.error(error.message); return; }
    toast.success("Réglages enregistrés");
    qc.invalidateQueries({ queryKey: ["scoring-reglages"] });
  }

  const modifie = !!data && (jours.slice().sort().join() !== data.jours_jeu_ven.slice().sort().join() || tri !== data.jeu_ven_tri);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tag « Jeu-Ven »</CardTitle>
        <CardDescription>
          Les leads entrés ces jours-là (heure de Paris) reçoivent le tag : ils ont peu de temps avant la conférence du dimanche.
          Par défaut, le tag est seulement affiché ; active le tri quand les chiffres du rapport le confirment.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-5">
        <div className="flex gap-3">
          {JOURS.map((j, i) => (
            <label key={j} className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={jours.includes(i + 1)} onCheckedChange={(c) => setJours((js) => (c ? [...js, i + 1] : js.filter((x) => x !== i + 1)))} />
              {j}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={tri} onCheckedChange={setTri} /> Les faire passer en tête de file, à priorité égale
        </label>
        <Button size="sm" onClick={enregistrer} disabled={!modifie} className="ml-auto">Enregistrer</Button>
      </CardContent>
    </Card>
  );
}
