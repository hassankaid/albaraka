// « Gérer les sources » (demande de Sidali du 28/10/2026), réservé au CEO.
// Sources (canaux) : renommer, activer/désactiver, créer (avec le lien ?src= à utiliser),
// fusionner, supprimer si aucun lead. Tunnels : renommer, afficher/masquer.
// Désactiver ne perd jamais un lead : il est enregistré, et une alerte s'affiche ici.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, GitMerge, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { TUNNEL_HOST } from "@/lib/hosts";
import { badgeCouleur } from "@/lib/leadConfig";
import { cleDepuisLibelle, GROUPES, MOTS_RESERVES, sourcesProches, useCanaux, useTunnels, type Canal, type GroupeCanal } from "@/lib/leadSources";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Stat = { n: number; dernier: string | null };
type Stats = { canaux: Record<string, Stat>; tunnels: Record<string, Stat> };

const LIENS_TUNNELS = [
  { nom: "Tunnel WhatsApp (conférence)", chemin: "/webinaire" },
  { nom: "Tunnel VSL", chemin: "/vsl" },
  { nom: "Tunnel Liberty", chemin: "/liberty" },
];

const date = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");

function Nom({ valeur, onEnregistrer }: { valeur: string; onEnregistrer: (v: string) => Promise<unknown> }) {
  const [edition, setEdition] = useState(false);
  const [v, setV] = useState(valeur);
  if (!edition)
    return (
      <button type="button" className="group flex min-w-0 items-center gap-1.5 text-left" onClick={() => { setV(valeur); setEdition(true); }}>
        <span className="truncate font-medium">{valeur}</span>
        <Pencil className="h-3 w-3 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100" />
      </button>
    );
  const valider = async () => {
    if (v.trim() && v.trim() !== valeur) await onEnregistrer(v.trim());
    setEdition(false);
  };
  return (
    <div className="flex items-center gap-1">
      <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") valider(); if (e.key === "Escape") setEdition(false); }} className="h-7 text-sm" />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={valider} aria-label="Enregistrer"><Check className="h-3.5 w-3.5" /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEdition(false)} aria-label="Annuler"><X className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

function Liens({ cle }: { cle: string }) {
  return (
    <div className="space-y-1">
      {LIENS_TUNNELS.map((t) => {
        const url = `https://${TUNNEL_HOST}${t.chemin}?src=${cle}`;
        return (
          <div key={t.chemin} className="flex items-center gap-2 text-xs">
            <span className="w-44 shrink-0 text-muted-foreground">{t.nom}</span>
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5">{url}</code>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Lien copié"))} aria-label="Copier le lien">
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function NouvelleSource({ canaux, onCree }: { canaux: Canal[]; onCree: () => void }) {
  const [libelle, setLibelle] = useState("");
  const [groupe, setGroupe] = useState<GroupeCanal>("ads");
  const [envoi, setEnvoi] = useState(false);
  const [cree, setCree] = useState<string | null>(null);
  const cle = cleDepuisLibelle(libelle);
  const proches = useMemo(() => (libelle.trim().length >= 3 ? sourcesProches(libelle, canaux) : []), [libelle, canaux]);
  const prise = !!cle && (MOTS_RESERVES.includes(cle) || canaux.some((c) => c.cle === cle));

  async function creer() {
    setEnvoi(true);
    const { data, error } = await db.rpc("lead_canal_creer", { p_libelle: libelle, p_groupe: groupe });
    setEnvoi(false);
    if (error) return toast.error(error.message);
    setCree(data as string);
    setLibelle("");
    onCree();
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-sm font-semibold">Nouvelle source</p>
      <div className="flex flex-wrap gap-2">
        <Input value={libelle} onChange={(e) => { setLibelle(e.target.value); setCree(null); }} placeholder="Ex. : LinkedIn Ads, Partenariat X…" className="h-9 min-w-[220px] flex-1" />
        <Select value={groupe} onValueChange={(v) => setGroupe(v as GroupeCanal)}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{GROUPES.map((g) => <SelectItem key={g.cle} value={g.cle}>{g.nom}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="h-9 gap-1.5" disabled={!cle || prise || envoi} onClick={creer}>
          {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Créer
        </Button>
      </div>
      {prise && <p className="text-xs text-red-600 dark:text-red-300">Ce nom est déjà pris. Choisis-en un autre.</p>}
      {!prise && proches.length > 0 && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Existe déjà : {proches.map((c) => c.libelle).join(", ")}. Si c'est la même chose, utilise plutôt celle-là.
        </p>
      )}
      {cree && (
        <div className="space-y-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5">
          <p className="text-xs font-semibold">Source créée. Les liens à utiliser dans tes publications ou tes pubs :</p>
          <Liens cle={cree} />
        </div>
      )}
    </div>
  );
}

export function GestionSources({ open, onOpenChange, onModifie }: { open: boolean; onOpenChange: (o: boolean) => void; onModifie?: () => void }) {
  const qc = useQueryClient();
  const { data: canaux = [] } = useCanaux();
  const { data: tunnels = [] } = useTunnels();
  const { data: stats } = useQuery({
    queryKey: ["lead-sources-stats"],
    enabled: open,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await db.rpc("lead_sources_stats");
      if (error) throw error;
      return data ?? { canaux: {}, tunnels: {} };
    },
  });
  const [fusion, setFusion] = useState<Canal | null>(null);
  const [cible, setCible] = useState("");
  const [liens, setLiens] = useState<string | null>(null);
  const [suppression, setSuppression] = useState<Canal | null>(null);

  const recharger = () => {
    qc.invalidateQueries({ queryKey: ["lead-canaux"] });
    qc.invalidateQueries({ queryKey: ["lead-tunnels"] });
    qc.invalidateQueries({ queryKey: ["lead-sources-stats"] });
    // une fusion change le canal des leads : la page les recharge
    onModifie?.();
  };
  async function rpc(nom: string, params: Record<string, unknown>, ok?: string) {
    const { error } = await db.rpc(nom, params);
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (ok) toast.success(ok);
    recharger();
    return true;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les sources</DialogTitle>
          <DialogDescription>
            Renomme, active ou désactive les sources et les tunnels. Une source désactivée disparaît des filtres et du formulaire, mais ses leads gardent leur source, et un lead qui arrive encore dessus est toujours enregistré.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="sources" className="min-w-0">
          <TabsList>
            <TabsTrigger value="sources">Sources ({canaux.length})</TabsTrigger>
            <TabsTrigger value="tunnels">Tunnels ({tunnels.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            <NouvelleSource canaux={canaux} onCree={recharger} />
            {GROUPES.map((g) => {
              const liste = canaux.filter((c) => c.groupe === g.cle);
              if (!liste.length) return null;
              return (
                <div key={g.cle} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.nom}</p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {liste.map((c) => {
                      const s = stats?.canaux[c.cle];
                      const n = s?.n ?? 0;
                      const arrive = !c.actif && c.desactive_le && s?.dernier && s.dernier > c.desactive_le;
                      return (
                        <div key={c.cle} className={cn("space-y-1.5 px-3 py-2", !c.actif && "bg-muted/30")} data-testid={`source-${c.cle}`}>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border", badgeCouleur(c.couleur))} />
                            <div className={cn("min-w-0 flex-1 text-sm", !c.actif && "text-muted-foreground")}>
                              <Nom valeur={c.libelle} onEnregistrer={(v) => rpc("lead_canal_modifier", { p_cle: c.cle, p_libelle: v, p_actif: c.actif }, "Source renommée")} />
                            </div>
                            <span className="w-40 text-right text-xs tabular-nums text-muted-foreground">
                              {stats ? `${n.toLocaleString("fr-FR")} lead${n > 1 ? "s" : ""} · ${date(s?.dernier)}` : "…"}
                            </span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" title="Liens à utiliser (?src=)" onClick={() => setLiens(liens === c.cle ? null : c.cle)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" disabled={c.systeme} title={c.systeme ? "Source de secours : ne peut pas être fusionnée" : "Fusionner avec une autre source"} onClick={() => { setFusion(c); setCible(""); }}>
                              <GitMerge className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              disabled={c.systeme || n > 0}
                              title={c.systeme ? "Source de secours : ne peut pas être supprimée" : n > 0 ? "Cette source a des leads : désactive-la ou fusionne-la" : "Supprimer"}
                              onClick={() => setSuppression(c)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Switch checked={c.actif} disabled={c.systeme} onCheckedChange={(v) => rpc("lead_canal_modifier", { p_cle: c.cle, p_libelle: c.libelle, p_actif: v }, v ? "Source activée" : "Source désactivée")} aria-label="Active" />
                          </div>
                          {arrive && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                              <AlertTriangle className="h-3.5 w-3.5" /> Un lead est encore arrivé le {date(s?.dernier)} après la désactivation : un lien ou une pub l'utilise toujours.
                            </p>
                          )}
                          {liens === c.cle && (
                            <div className="rounded-md bg-muted/40 p-2">
                              {c.groupe === "apporteur" || c.cle === "sans_source" || c.cle === "autre" ? (
                                <p className="text-xs text-muted-foreground">Cette source ne s'utilise pas dans un lien de tunnel.</p>
                              ) : (
                                <Liens cle={c.cle} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="tunnels" className="space-y-2">
            <p className="text-xs text-muted-foreground">Un nouveau tunnel est créé avec son développement. Ici, tu peux le renommer, ou le masquer des filtres.</p>
            <div className="divide-y divide-border rounded-lg border border-border">
              {tunnels.map((t) => {
                const s = stats?.tunnels[t.cle];
                return (
                  <div key={t.cle} className={cn("flex flex-wrap items-center gap-3 px-3 py-2", !t.actif && "bg-muted/30")}>
                    <div className={cn("min-w-0 flex-1 text-sm", !t.actif && "text-muted-foreground")}>
                      <Nom valeur={t.libelle} onEnregistrer={(v) => rpc("lead_tunnel_modifier", { p_cle: t.cle, p_libelle: v, p_actif: t.actif }, "Tunnel renommé")} />
                    </div>
                    <span className="w-40 text-right text-xs tabular-nums text-muted-foreground">
                      {stats ? `${(s?.n ?? 0).toLocaleString("fr-FR")} leads · ${date(s?.dernier)}` : "…"}
                    </span>
                    <Switch checked={t.actif} onCheckedChange={(v) => rpc("lead_tunnel_modifier", { p_cle: t.cle, p_libelle: t.libelle, p_actif: v })} aria-label="Visible dans les filtres" />
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={!!suppression} onOpenChange={(o) => !o && setSuppression(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Supprimer « {suppression?.libelle} » ?</DialogTitle>
              <DialogDescription>Elle n'a aucun lead. Si un lien avec cette source est encore utilisé, ses leads arriveront dans « Sans source ».</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setSuppression(null)}>Annuler</Button>
              <Button variant="destructive" onClick={async () => { if (await rpc("lead_canal_supprimer", { p_cle: suppression!.cle }, "Source supprimée")) setSuppression(null); }}>
                Supprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!fusion} onOpenChange={(o) => !o && setFusion(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Fusionner « {fusion?.libelle} »</DialogTitle>
              <DialogDescription>
                Ses leads et ses liens (?src=) passent dans la source choisie, puis « {fusion?.libelle} » disparaît. À utiliser pour réunir deux sources qui désignent la même chose.
              </DialogDescription>
            </DialogHeader>
            <Select value={cible} onValueChange={setCible}>
              <SelectTrigger><SelectValue placeholder="Fusionner dans…" /></SelectTrigger>
              <SelectContent>
                {canaux.filter((c) => c.cle !== fusion?.cle).map((c) => <SelectItem key={c.cle} value={c.cle}>{c.libelle}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFusion(null)}>Annuler</Button>
              <Button disabled={!cible} onClick={async () => { if (await rpc("lead_canal_fusionner", { p_de: fusion!.cle, p_vers: cible }, "Sources fusionnées")) setFusion(null); }}>
                Fusionner
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
