import { useState, useEffect, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, RefreshCw, Users, UserCheck, UserX, ArrowUpRight,
  ShieldCheck, ShieldAlert, MoreHorizontal, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Eye, EyeOff,
} from "lucide-react";

/** Montant en euros, sans decimales inutiles a l'ecran. */
const eur = (n?: number) =>
  (n ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " \u20AC";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_also_apporteur: boolean | null;
  collaborateur_level: string | null;
  created_at: string | null;
  /** Leads assignés, et parmi eux ceux réellement travaillés (statut autre
   *  que « a_qualifier »). L'écart entre les deux est l'information utile. */
  leads_recus?: number;
  leads_travailles?: number;
  sale_count?: number;
  /** Trois périmètres distincts : généré (hors annulées), acquis (l'argent du
   *  client est arrivé), payé (l'apporteur a été réglé). */
  commissions_generees?: number;
  commissions_acquises?: number;
  commissions_payees?: number;
  derniere_presence?: string | null;
  derniere_action?: string | null;
}

type Tab = "collaborateurs" | "apporteurs";

export default function AdminTeam() {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("collaborateurs");
  // Les inactifs sont masques par defaut : ils representent 8 collaborateurs
  // sur 19, soit 42 % de l'onglet, et n'ont plus de chiffres a suivre.
  const [montrerInactifs, setMontrerInactifs] = useState(false);

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => Promise<void>;
  }>({ open: false, title: "", description: "", action: async () => {} });

  const fetchMembers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, avatar_url, is_also_apporteur, created_at, collaborateur_level, is_active")
      .in("role", ["collaborateur", "apporteur"])
      .order("full_name");

    if (!profiles) { setLoading(false); return; }

    // Les chiffres sont agrégés CÔTÉ BASE. Ils étaient auparavant calculés ici
    // par trois requêtes directes — mais PostgREST plafonne toute réponse à
    // 1 000 lignes, sans erreur : sur 5 342 leads assignés la page en lisait
    // 1 000 (81 % perdus), sur 2 217 commissions elle en lisait 1 000 (55 %).
    // Les nombres affichés étaient faux, et faux de façon incohérente selon
    // les membres. Compter 5 000 lignes dans le navigateur pour afficher un
    // total n'avait de toute façon aucun sens.
    const { data: stats } = await (supabase as any).rpc("statistiques_equipe");
    const parId = new Map<string, any>((stats ?? []).map((s: any) => [s.user_id, s]));

    setMembers(profiles.map(p => {
      const st = parId.get(p.id) ?? {};
      return {
        ...p,
        is_active: (p as any).is_active ?? true,
        collaborateur_level: (p as any).collaborateur_level ?? null,
        leads_recus: Number(st.leads_recus ?? 0),
        leads_travailles: Number(st.leads_travailles ?? 0),
        sale_count: Number(st.ventes ?? 0),
        commissions_generees: Number(st.commissions_generees ?? 0),
        commissions_acquises: Number(st.commissions_acquises ?? 0),
        commissions_payees: Number(st.commissions_payees ?? 0),
        derniere_presence: st.derniere_presence ?? null,
        derniere_action: st.derniere_action ?? null,
      };
    }));
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const collaborateurs = useMemo(() => members.filter(m => m.role === "collaborateur"), [members]);
  const apporteurs = useMemo(() => members.filter(m => m.role === "apporteur"), [members]);

  /** Inactifs de l'onglet courant — sert au compteur du bouton. */
  const nbInactifs = useMemo(() => {
    const source = tab === "collaborateurs" ? collaborateurs : apporteurs;
    return source.filter((m) => !m.is_active).length;
  }, [tab, collaborateurs, apporteurs]);

  const displayed = useMemo(() => {
    let source = tab === "collaborateurs" ? collaborateurs : apporteurs;
    if (!montrerInactifs) source = source.filter((m) => m.is_active);
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q))
    );
  }, [tab, collaborateurs, apporteurs, search, montrerInactifs]);

  // Actions
  const confirmAction = (title: string, description: string, action: () => Promise<void>) => {
    setConfirmDialog({ open: true, title, description, action });
  };

  const runConfirmedAction = async () => {
    await confirmDialog.action();
    setConfirmDialog({ open: false, title: "", description: "", action: async () => {} });
    fetchMembers();
  };

  const promoteToCollab = (m: TeamMember) => confirmAction(
    "Promouvoir en collaborateur",
    `${m.full_name} deviendra collaborateur intermédiaire. Il ne pourra pas s'affecter de leads lui-même.`,
    async () => {
      const { error } = await supabase.from("profiles")
        .update({ role: "collaborateur", collaborateur_level: "intermediaire", is_also_apporteur: true })
        .eq("id", m.id);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else toast({ title: `${m.full_name} promu collaborateur` });
    }
  );

  const demoteToApporteur = (m: TeamMember) => confirmAction(
    "Rétrograder en apporteur",
    `${m.full_name} redeviendra apporteur et perdra ses accès collaborateur.`,
    async () => {
      const { error } = await supabase.from("profiles")
        .update({ role: "apporteur", collaborateur_level: null })
        .eq("id", m.id);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else toast({ title: `${m.full_name} rétrogradé` });
    }
  );

  const changeLevel = (m: TeamMember, level: string) => {
    const label = level === "confirme" ? "Confirmé" : "Intermédiaire";
    const desc = level === "confirme"
      ? `${m.full_name} pourra s'affecter des leads lui-même.`
      : `${m.full_name} ne pourra plus s'affecter de leads. Vous devrez le faire manuellement.`;
    confirmAction(`Passer en ${label}`, desc, async () => {
      const { error } = await supabase.from("profiles")
        .update({ collaborateur_level: level })
        .eq("id", m.id);
      if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
      else toast({ title: `Niveau mis à jour : ${label}` });
    });
  };

  const toggleActive = (m: TeamMember) => {
    const hasApporteurAccess = m.is_also_apporteur;
    confirmAction(
      m.is_active ? "Désactiver le rôle collaborateur" : "Réactiver ce membre",
      m.is_active
        ? `${m.full_name} ne pourra plus accéder au CRM en tant que collaborateur.${hasApporteurAccess ? " Son espace apporteur restera accessible." : ""} Son historique (leads, ventes, commissions) est conservé et reste exploitable.`
        : `${m.full_name} retrouvera l'accès complet au CRM collaborateur.`,
      async () => {
        const { error } = await supabase.from("profiles")
          .update({ is_active: !m.is_active })
          .eq("id", m.id);
        if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
        else toast({ title: m.is_active ? `${m.full_name} désactivé comme collaborateur` : `${m.full_name} réactivé` });
      }
    );
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (user?.role !== "ceo") return null;

  const tabs = [
    { id: "collaborateurs" as Tab, label: "Collaborateurs", count: collaborateurs.length, icon: UserCheck },
    { id: "apporteurs" as Tab, label: "Apporteurs", count: apporteurs.length, icon: Users },
  ];

  return (
    <div className="space-y-5">
      {/* KPI bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border">
          <Users className="h-3.5 w-3.5 text-primary" />
          <span className="text-sm font-bold text-foreground">{members.length}</span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-blue-500/30">
          <UserCheck className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-sm font-bold text-foreground">{collaborateurs.length}</span>
          <span className="text-xs text-muted-foreground">collabs</span>
        </div>
        {members.filter(m => !m.is_active).length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-destructive/30">
            <UserX className="h-3.5 w-3.5 text-destructive" />
            <span className="text-sm font-bold text-foreground">{members.filter(m => !m.is_active).length}</span>
            <span className="text-xs text-muted-foreground">inactifs</span>
          </div>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              <span className={`text-xs ${tab === t.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        {/* Le compteur dans le libelle est deliberé : un filtre muet laisse
            croire que la liste est complete. Ici on sait toujours ce qu'on
            ne voit pas. */}
        {nbInactifs > 0 && (
          <Button
            variant={montrerInactifs ? "default" : "outline"}
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => setMontrerInactifs((v) => !v)}
            aria-pressed={montrerInactifs}
          >
            {montrerInactifs ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Inactifs ({nbInactifs})
          </Button>
        )}

        <Button variant="outline" size="icon" className="h-8 w-8" onClick={fetchMembers} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Membre</TableHead>
              {tab === "collaborateurs" && <TableHead>Niveau</TableHead>}
              <TableHead className="text-center">Leads<div className="text-[10px] font-normal normal-case opacity-60">travaillés / reçus</div></TableHead>
              <TableHead className="text-center">Ventes</TableHead>
              <TableHead className="text-right">Commissions<div className="text-[10px] font-normal normal-case opacity-60">acquis / généré</div></TableHead>
              <TableHead>Présence</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={tab === "collaborateurs" ? 7 : 6} className="text-center py-12 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tab === "collaborateurs" ? 7 : 6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Aucun {tab === "collaborateurs" ? "collaborateur" : "apporteur"} trouvé</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : displayed.map(member => (
              <TableRow key={member.id} className={!member.is_active ? "opacity-40" : ""}>
                {/* Member info */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 text-xs">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{member.full_name}</p>
                        {!member.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-destructive/40 text-destructive">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                  </div>
                </TableCell>

                {/* Level (collabs only) */}
                {tab === "collaborateurs" && (
                  <TableCell>
                    {member.collaborateur_level === "confirme" ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                        <ShieldCheck className="h-3 w-3" /> Confirmé
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1 text-xs">
                        <ShieldAlert className="h-3 w-3" /> Intermédiaire
                      </Badge>
                    )}
                  </TableCell>
                )}

                {/* Stats */}
                <TableCell className="text-center">
                  <span className="text-sm font-medium text-foreground">{member.leads_travailles ?? 0}</span>
                  <span className="text-xs text-muted-foreground"> / {member.leads_recus ?? 0}</span>
                  {/* L'écart entre reçus et travaillés est l'information que
                      Hassan cherchait : ce qu'on distribue contre ce qu'on traite. */}
                  {(member.leads_recus ?? 0) > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      {Math.round(100 * (member.leads_travailles ?? 0) / (member.leads_recus ?? 1))} %
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-medium text-foreground">{member.sale_count}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm font-medium text-foreground">
                    {eur(member.commissions_acquises)}
                  </div>
                  {/* Le généré en second : c'est le total du contrat, alors que
                      l'acquis est ce que le client a réellement versé. */}
                  {(member.commissions_generees ?? 0) !== (member.commissions_acquises ?? 0) && (
                    <div className="text-[11px] text-muted-foreground">
                      sur {eur(member.commissions_generees)}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-xs text-foreground">
                    {member.derniere_presence
                      ? formatDistanceToNow(new Date(member.derniere_presence), { addSuffix: true, locale: fr })
                      : <span className="text-destructive">jamais connecté</span>}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {member.derniere_action
                      ? `activité ${formatDistanceToNow(new Date(member.derniere_action), { addSuffix: true, locale: fr })}`
                      : "aucune activité"}
                  </div>
                </TableCell>

                {/* Actions dropdown */}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                     <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={async () => {
                        try {
                          const { data, error } = await supabase.functions.invoke("impersonate-user", {
                            body: { target_user_id: member.id },
                          });
                          if (error || !data?.url) throw new Error(error?.message || "Lien non généré");
                          window.open(data.url, "_blank", "noopener");
                        } catch (err: any) {
                          toast({ title: "Erreur", description: err.message, variant: "destructive" });
                        }
                      }}>
                        <Eye className="h-4 w-4 mr-2 text-amber-400" />
                        Se connecter en tant que
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {member.role === "collaborateur" && (
                        member.collaborateur_level === "confirme" ? (
                          <DropdownMenuItem onClick={() => changeLevel(member, "intermediaire")}>
                            <ChevronDown className="h-4 w-4 mr-2 text-amber-400" />
                            Passer Intermédiaire
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => changeLevel(member, "confirme")}>
                            <ChevronUp className="h-4 w-4 mr-2 text-emerald-400" />
                            Passer Confirmé
                          </DropdownMenuItem>
                        )
                      )}
                      {member.role === "apporteur" && (
                        <DropdownMenuItem onClick={() => promoteToCollab(member)}>
                          <ArrowUpRight className="h-4 w-4 mr-2 text-blue-400" />
                          Promouvoir collaborateur
                        </DropdownMenuItem>
                      )}
                      {member.role === "collaborateur" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleActive(member)}>
                            {member.is_active ? (
                              <>
                                <ToggleLeft className="h-4 w-4 mr-2 text-muted-foreground" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <ToggleRight className="h-4 w-4 mr-2 text-emerald-400" />
                                Réactiver
                              </>
                            )}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Annuler</Button>
            <Button onClick={runConfirmedAction}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
