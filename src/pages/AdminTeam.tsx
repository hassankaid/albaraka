import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search, RefreshCw, Users, UserCheck, UserX, ArrowUpRight,
  Shield, ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight,
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
  // Stats
  lead_count?: number;
  sale_count?: number;
  commission_total?: number;
}

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "Tous les rôles" },
  { value: "collaborateur", label: "Collaborateurs" },
  { value: "apporteur", label: "Apporteurs" },
];

export default function AdminTeam() {
  const { profile: user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<TeamMember | null>(null);
  const [levelDialogOpen, setLevelDialogOpen] = useState(false);
  const [levelTarget, setLevelTarget] = useState<TeamMember | null>(null);
  const [newLevel, setNewLevel] = useState<string>("intermediaire");

  const fetchMembers = async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, phone, avatar_url, is_also_apporteur, created_at, collaborateur_level, is_active")
      .in("role", ["collaborateur", "apporteur"])
      .order("full_name");

    if (!profiles) { setLoading(false); return; }

    // Fetch stats in parallel
    const [{ data: leadStats }, { data: saleStats }, { data: commissionStats }] = await Promise.all([
      supabase.from("leads").select("assigned_to").in("assigned_to", profiles.map(p => p.id)),
      supabase.from("sales").select("closed_by").in("closed_by", profiles.map(p => p.id)),
      supabase.from("commissions").select("beneficiary_user_id, amount").in("beneficiary_user_id", profiles.map(p => p.id)),
    ]);

    const leadCountMap: Record<string, number> = {};
    leadStats?.forEach(l => { leadCountMap[l.assigned_to!] = (leadCountMap[l.assigned_to!] || 0) + 1; });

    const saleCountMap: Record<string, number> = {};
    saleStats?.forEach(s => { saleCountMap[s.closed_by!] = (saleCountMap[s.closed_by!] || 0) + 1; });

    const commissionMap: Record<string, number> = {};
    commissionStats?.forEach(c => {
      commissionMap[c.beneficiary_user_id!] = (commissionMap[c.beneficiary_user_id!] || 0) + (Number(c.amount) || 0);
    });

    setMembers(profiles.map(p => ({
      ...p,
      is_active: (p as any).is_active ?? true,
      collaborateur_level: (p as any).collaborateur_level ?? null,
      lead_count: leadCountMap[p.id] || 0,
      sale_count: saleCountMap[p.id] || 0,
      commission_total: Math.round((commissionMap[p.id] || 0) * 100) / 100,
    })));

    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = useMemo(() => {
    let result = members;
    if (roleFilter !== "all") result = result.filter(m => m.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q))
      );
    }
    return result;
  }, [members, roleFilter, search]);

  const counts = useMemo(() => ({
    total: members.length,
    collaborateurs: members.filter(m => m.role === "collaborateur").length,
    apporteurs: members.filter(m => m.role === "apporteur").length,
    inactifs: members.filter(m => !m.is_active).length,
  }), [members]);

  const handlePromote = async () => {
    if (!promoteTarget) return;
    const { error } = await supabase
      .from("profiles")
      .update({ role: "collaborateur", collaborateur_level: "intermediaire" })
      .eq("id", promoteTarget.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${promoteTarget.full_name} est maintenant collaborateur intermédiaire` });
      fetchMembers();
    }
    setPromoteDialogOpen(false);
    setPromoteTarget(null);
  };

  const handleChangeLevel = async () => {
    if (!levelTarget) return;
    const { error } = await supabase
      .from("profiles")
      .update({ collaborateur_level: newLevel })
      .eq("id", levelTarget.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Niveau mis à jour : ${newLevel === "confirme" ? "Confirmé" : "Intermédiaire"}` });
      fetchMembers();
    }
    setLevelDialogOpen(false);
    setLevelTarget(null);
  };

  const handleToggleActive = async (member: TeamMember) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: member.is_active ? `${member.full_name} désactivé` : `${member.full_name} réactivé` });
      fetchMembers();
    }
  };

  const handleDemoteToApporteur = async (member: TeamMember) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "apporteur", collaborateur_level: null })
      .eq("id", member.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${member.full_name} est redevenu apporteur` });
      fetchMembers();
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getLevelBadge = (member: TeamMember) => {
    if (member.role !== "collaborateur") return null;
    if (member.collaborateur_level === "confirme") {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1">
          <ShieldCheck className="h-3 w-3" /> Confirmé
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
        <ShieldAlert className="h-3 w-3" /> Intermédiaire
      </Badge>
    );
  };

  const getRoleBadge = (role: string) => {
    if (role === "collaborateur") {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Collaborateur</Badge>;
    }
    return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Apporteur</Badge>;
  };

  if (user?.role !== "ceo") return null;

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.total}</p>
              <p className="text-xs text-muted-foreground">Total membres</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <UserCheck className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.collaborateurs}</p>
              <p className="text-xs text-muted-foreground">Collaborateurs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.apporteurs}</p>
              <p className="text-xs text-muted-foreground">Apporteurs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <UserX className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{counts.inactifs}</p>
              <p className="text-xs text-muted-foreground">Inactifs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTER_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchMembers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-center">Ventes</TableHead>
              <TableHead className="text-right">Commissions</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  Aucun membre trouvé
                </TableCell>
              </TableRow>
            ) : filtered.map(member => (
              <TableRow key={member.id} className={!member.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 text-xs">
                      {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {getInitials(member.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getRoleBadge(member.role)}</TableCell>
                <TableCell>{getLevelBadge(member) || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
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
                <TableCell>
                  {member.is_active ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Actif</Badge>
                  ) : (
                    <Badge className="bg-destructive/20 text-destructive border-destructive/30">Inactif</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    {member.role === "apporteur" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs h-7"
                        onClick={() => { setPromoteTarget(member); setPromoteDialogOpen(true); }}
                      >
                        <ArrowUpRight className="h-3 w-3" /> Promouvoir
                      </Button>
                    )}
                    {member.role === "collaborateur" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-7"
                          onClick={() => {
                            setLevelTarget(member);
                            setNewLevel(member.collaborateur_level === "confirme" ? "intermediaire" : "confirme");
                            setLevelDialogOpen(true);
                          }}
                        >
                          <Shield className="h-3 w-3" />
                          {member.collaborateur_level === "confirme" ? "→ Intermédiaire" : "→ Confirmé"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDemoteToApporteur(member)}
                        >
                          Rétrograder
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => handleToggleActive(member)}
                    >
                      {member.is_active
                        ? <ToggleRight className="h-4 w-4 text-emerald-400" />
                        : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      }
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Promote dialog */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promouvoir en collaborateur</DialogTitle>
            <DialogDescription>
              {promoteTarget?.full_name} passera d'apporteur à collaborateur intermédiaire.
              Il ne pourra pas s'affecter de leads lui-même — vous devrez le faire manuellement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteDialogOpen(false)}>Annuler</Button>
            <Button onClick={handlePromote}>Confirmer la promotion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change level dialog */}
      <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le niveau</DialogTitle>
            <DialogDescription>
              {levelTarget?.full_name} passera en niveau{" "}
              <strong>{newLevel === "confirme" ? "Confirmé" : "Intermédiaire"}</strong>.
              {newLevel === "confirme"
                ? " Il pourra s'affecter des leads lui-même."
                : " Vous devrez lui affecter les leads manuellement."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleChangeLevel}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
