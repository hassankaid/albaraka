// Analyse d'appels, V1 coach (cahier des charges de Sidali ; maquette validée le 25/10/2026).
// La liste : à valider, en cours, validés. « Analyser un appel » ouvre le dépôt.
// Réservé aux coachs (profiles.is_coach) et au CEO ; l'élève ne voit rien en V1.
import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAppels, type AppelResume } from "@/hooks/useAppels";
import { duree, LIBELLE_STATUT, nomType, rangEtape, ETAPES_MACHINE } from "@/lib/appels/retour";
import { DeposerAppel } from "@/components/appels/DeposerAppel";

type Onglet = "a_valider" | "en_cours" | "valides";

const ONGLETS: { cle: Onglet; nom: string; statuts: AppelResume["statut"][] }[] = [
  { cle: "a_valider", nom: "À valider", statuts: ["a_valider"] },
  { cle: "en_cours", nom: "En cours", statuts: ["depose", "en_cours", "erreur"] },
  { cle: "valides", nom: "Validés", statuts: ["valide"] },
];

function quand(iso: string) {
  const d = new Date(iso);
  const jours = Math.floor((Date.now() - d.getTime()) / 86400000);
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (jours === 0 && new Date().getDate() === d.getDate()) return `aujourd'hui ${heure}`;
  if (jours <= 1) return `hier ${heure}`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function Statut({ a }: { a: AppelResume }) {
  if (a.statut === "en_cours" || a.statut === "depose") {
    const pct = Math.round(((rangEtape(a.etape) + 1) / (ETAPES_MACHINE.length + 1)) * 100);
    return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${a.statut === "depose" ? 5 : pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{a.statut === "depose" ? "Dépôt…" : "Analyse…"}</span>
      </div>
    );
  }
  const couleur = {
    a_valider: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    valide: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    erreur: "bg-red-500/15 text-red-700 dark:text-red-300",
  }[a.statut as "a_valider" | "valide" | "erreur"];
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", couleur)}>{LIBELLE_STATUT[a.statut]}</span>;
}

function Note({ a }: { a: AppelResume }) {
  const n = a.statut === "valide" ? a.note_finale : a.note_ia;
  if (n == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      <span className="text-lg font-extrabold tabular-nums">{Math.round(n)}</span>
      <span className="text-xs text-muted-foreground">/100</span>
    </span>
  );
}

export default function AnalyseAppels() {
  const { profile } = useAuth();
  const acces = !!profile && (profile.is_coach || profile.role === "ceo");
  const { data: appels, isLoading } = useAppels();
  const [onglet, setOnglet] = useState<Onglet>("a_valider");
  const [q, setQ] = useState("");
  const [depot, setDepot] = useState(false);

  const compte = (o: Onglet) => (appels ?? []).filter((a) => ONGLETS.find((x) => x.cle === o)!.statuts.includes(a.statut)).length;
  const visibles = useMemo(() => {
    const statuts = ONGLETS.find((x) => x.cle === onglet)!.statuts;
    const m = q.trim().toLowerCase();
    return (appels ?? []).filter(
      (a) => statuts.includes(a.statut) && (!m || `${a.eleve?.full_name ?? ""} ${a.eleve?.email ?? ""}`.toLowerCase().includes(m)),
    );
  }, [appels, onglet, q]);

  if (profile && !acces) return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-6xl space-y-6" data-testid="analyse-appels">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analyse d'appels</h1>
          <p className="text-sm text-muted-foreground">Dépose l'appel d'un élève : l'IA prépare le retour, tu le valides.</p>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setDepot(true)} data-testid="analyser-appel">
          <Plus className="h-4 w-4" /> Analyser un appel
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              onClick={() => setOnglet(o.cle)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                onglet === o.cle ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.nom}
              <span className={cn("ml-1.5 text-xs", o.cle === "a_valider" && compte(o.cle) > 0 && "rounded-full bg-primary px-1.5 py-px text-primary-foreground")}>
                {compte(o.cle)}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un élève" className="h-9 pl-9" />
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="mx-auto my-16 h-6 w-6 animate-spin text-muted-foreground" />
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
          {onglet === "a_valider"
            ? "Aucun appel à valider. Clique sur « Analyser un appel » pour en déposer un."
            : onglet === "en_cours"
              ? "Aucune analyse en cours."
              : "Aucun appel validé pour l'instant."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="hidden border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-semibold">Élève</th>
                <th className="px-4 py-3 font-semibold">Type d'appel</th>
                <th className="px-4 py-3 font-semibold">Déposé</th>
                <th className="px-4 py-3 font-semibold">Durée</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibles.map((a) => (
                <tr key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 md:table-row md:px-0 md:py-0" data-testid="ligne-appel">
                  <td className="w-full md:w-auto md:px-4 md:py-3">
                    <p className="font-semibold">{a.eleve?.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{a.eleve?.email}</p>
                  </td>
                  <td className="md:px-4 md:py-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{nomType(a.type_appel)}</span>
                  </td>
                  <td className="text-muted-foreground md:px-4 md:py-3">{quand(a.cree_le)}</td>
                  <td className="md:px-4 md:py-3">
                    {duree(a.duree_s)}
                    {a.alerte_duree && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> {a.alerte_duree.includes("court") ? "trop court" : "trop long"}
                      </span>
                    )}
                  </td>
                  <td className="md:px-4 md:py-3">
                    <Note a={a} />
                  </td>
                  <td className="md:px-4 md:py-3">
                    <Statut a={a} />
                  </td>
                  <td className="ml-auto md:px-4 md:py-3 md:text-right">
                    <Button asChild size="sm" variant={a.statut === "a_valider" ? "default" : "outline"}>
                      <Link to={`/coaching/analyse-appels/${a.id}`}>Ouvrir</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeposerAppel open={depot} onOpenChange={setDepot} />
    </div>
  );
}
