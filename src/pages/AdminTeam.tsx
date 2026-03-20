import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useViewAs } from "@/hooks/useViewAs";
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
  ToggleLeft, ToggleRight, Eye,
} from "lucide-react";

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
  lead_count?: number;
  sale_count?: number;
  commission_total?: number;
}

type Tab = "collaborateurs" | "apporteurs";

export default function AdminTeam() {
  const { profile: user } = useAuth();
  const { startViewAs } = useViewAs();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("collaborateurs");

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

    const ids = profiles.map(p => p.id);
    const [{ data: leadStats }, { data: saleStats }, { data: commissionStats }] = await Promise.all([
      supabase.from("leads").select("assigned_to").in("assigned_to", ids),
      supabase.from("sales").select("closed_by").in("closed_by", ids),
      supabase.from("commissions").select("beneficiary_user_id, amount").in("beneficiary_user_id", ids),
    ]);

    const leadMap: Record<string, number> = {};
    leadStats?.forEach(l => { leadMap[l.assigned_to!] = (leadMap[l.assigned_to!] || 0) + 1; });
    const saleMap: Record<string, number> = {};
    saleStats?.forEach(s => { saleMap[s.closed_by!] = (saleMap[s.closed_by!] || 0) + 1; });
    const commMap: Record<string, number> = {};
    commissionStats?.forEach(c => {
      commMap[c.beneficiary_user_id!] = (commMap[c.beneficiary_user_id!] || 0) + (Number(c.amount) || 0);
    });

    setMembers(profiles.map(p => ({
      ...p,
      is_active: (p as any).is_active ?? true,
      collaborateur_level: (p as any).collaborateur_level ?? null,
      lead_count: leadMap[p.id] || 0,
      sale_count: saleMap[p.id] || 0,
      commission_total: Math.round((commMap[p.id] || 0) * 100) / 100,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const collaborateurs = useMemo(() => members.filter(m => m.role === "collaborateur"), [members]);
  const apporteurs = useMemo(() => members.filter(m => m.role === "apporteur"), [members]);

  const displayed = useMemo(() => {
    const source = tab === "collaborateurs" ? collaborateurs : apporteurs;
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(m =>
      m.full_name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q))
    );
  }, [tab, collaborateurs, apporteurs, search]);

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
        .update({ role: "collaborateur", collaborateur_level: "intermediaire" })
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
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Ventes</TableHead>
              <TableHead className="text-right">Commissions</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={tab === "collaborateurs" ? 6 : 5} className="text-center py-12 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : displayed.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tab === "collaborateurs" ? 6 : 5} className="text-center py-12">
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
                  <span className="text-sm font-medium text-foreground">{member.lead_count}</span>
                </TableCell>
                <TableCell className="text-center">
                  <span className="text-sm font-medium text-foreground">{member.sale_count}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium text-foreground">
                    {member.commission_total?.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </span>
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
                      <DropdownMenuItem onClick={() => startViewAs({
                        id: member.id,
                        full_name: member.full_name,
                        email: member.email,
                        role: member.role,
                        collaborateur_level: member.collaborateur_level,
                        is_also_apporteur: member.is_also_apporteur,
                        can_add_instagram_leads: null,
                        avatar_url: member.avatar_url,
                        timezone: null,
                        is_active: member.is_active,
                      })}>
                        <Eye className="h-4 w-4 mr-2 text-amber-400" />
                        Voir en tant que
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
