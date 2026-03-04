import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";

interface Commission {
  id: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
}

interface AggregatedCommission {
  key: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  beneficiary_name: string;
  role: string;
  percentage: number;
  total: number;
  paid: number;
  remaining: number;
  paidCount: number;
  totalCount: number;
  commissionIds: string[];
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
  is_also_apporteur: boolean | null;
}

interface ManageCommissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  saleAmountHt: number;
  saleProduct: string;
  onUpdated: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  apporteur: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  setter: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  closer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "agence marketing": "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const ROLE_SUGGESTED_PCT: Record<string, number> = {
  apporteur: 25,
  setter: 10,
  closer: 15,
  "agence marketing": 20,
};

export default function ManageCommissionsModal({
  open, onOpenChange, saleId, saleAmountHt, saleProduct, onUpdated,
}: ManageCommissionsModalProps) {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [beneficiaryType, setBeneficiaryType] = useState<"collaborateur" | "apporteur" | "agence">("collaborateur");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [percentage, setPercentage] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPct, setEditPct] = useState("");

  const fetchCommissions = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("commissions")
      .select("id, beneficiary_user_id, beneficiary_external, role, percentage, amount, status")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: true });

    if (data) setCommissions(data);
    setLoading(false);
  }, [saleId]);

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("id, full_name, role, is_also_apporteur").order("full_name");
    if (data) setProfiles(data);
  }, []);

  useEffect(() => {
    if (open && saleId) {
      fetchCommissions();
      fetchProfiles();
    }
  }, [open, saleId, fetchCommissions, fetchProfiles]);

  // Suggest percentage when role changes
  useEffect(() => {
    if (selectedRole && ROLE_SUGGESTED_PCT[selectedRole]) {
      setPercentage(String(ROLE_SUGGESTED_PCT[selectedRole]));
    }
  }, [selectedRole]);

  // Aggregate commissions by beneficiary + role
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]));

  const aggregated: AggregatedCommission[] = (() => {
    const groups: Record<string, Commission[]> = {};
    for (const c of commissions) {
      const key = `${c.beneficiary_user_id || "ext"}_${c.beneficiary_external || ""}_${c.role}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    }
    return Object.entries(groups).map(([key, items]) => {
      const first = items[0];
      const total = items.reduce((s, c) => s + (c.amount || 0), 0);
      const paid = items.filter((c) => ["paid", "invoiced"].includes(c.status || "")).reduce((s, c) => s + (c.amount || 0), 0);
      const paidCount = items.filter((c) => ["paid", "invoiced", "due"].includes(c.status || "")).length;
      return {
        key,
        beneficiary_user_id: first.beneficiary_user_id,
        beneficiary_external: first.beneficiary_external,
        beneficiary_name: first.beneficiary_user_id
          ? profileMap[first.beneficiary_user_id] || "Inconnu"
          : first.beneficiary_external || "Externe",
        role: first.role,
        percentage: first.percentage,
        total,
        paid,
        remaining: total - paid,
        paidCount,
        totalCount: items.length,
        commissionIds: items.map((c) => c.id),
      };
    });
  })();

  const totalPct = aggregated.reduce((s, a) => s + a.percentage, 0);
  const totalAmount = aggregated.reduce((s, a) => s + a.total, 0);

  const resetForm = () => {
    setBeneficiaryType("collaborateur");
    setSelectedUserId("");
    setSelectedRole("");
    setPercentage("");
  };

  const handleAdd = async () => {
    if (!saleId || !selectedRole || !percentage || !selectedUserId) return;
    setAdding(true);
    try {
      // Insert global commission (trigger splits it per payment)
      const { error } = await supabase.from("commissions").insert({
        sale_id: saleId,
        beneficiary_user_id: selectedUserId,
        beneficiary_external: null,
        role: selectedRole,
        percentage: parseFloat(percentage),
        amount: Math.round(saleAmountHt * parseFloat(percentage) / 100),
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Commission ajoutée" });
      resetForm();
      fetchCommissions();
      onUpdated();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGroup = async (ids: string[]) => {
    for (const id of ids) {
      await supabase.from("commissions").delete().eq("id", id);
    }
    toast({ title: "Commission supprimée" });
    fetchCommissions();
    onUpdated();
  };

  const handleEditPct = async (group: AggregatedCommission) => {
    const newPct = parseFloat(editPct);
    if (isNaN(newPct) || newPct <= 0) return;

    try {
      // Update all commissions in the group — the trigger will recalculate amounts
      for (const id of group.commissionIds) {
        const { error } = await supabase
          .from("commissions")
          .update({ percentage: newPct })
          .eq("id", id);
        if (error) throw error;
      }
      toast({ title: "Pourcentage mis à jour" });
      setEditingKey(null);
      fetchCommissions();
      onUpdated();
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commissions — {saleProduct}</DialogTitle>
          <DialogDescription>Montant HT : {saleAmountHt.toLocaleString("fr-FR")} €</DialogDescription>
        </DialogHeader>

        {/* Aggregated commissions */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Commissions actuelles</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : aggregated.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune commission enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {aggregated.map((g) => (
                <div key={g.key} className="p-3 rounded-md border border-border bg-secondary/20 space-y-2">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{g.beneficiary_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[g.role] || ""}`}>
                          {g.role}
                        </Badge>
                        {editingKey === g.key ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editPct}
                              onChange={(e) => setEditPct(e.target.value)}
                              className="h-6 w-16 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEditPct(g)}>
                              <Check className="h-3 w-3 text-emerald-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingKey(null)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{g.percentage}%</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {editingKey !== g.key && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingKey(g.key); setEditPct(String(g.percentage)); }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGroup(g.commissionIds)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Total */}
                  <p className="text-sm font-semibold text-foreground">
                    Total : {g.total.toLocaleString("fr-FR")} €
                  </p>

                  {/* Progress bar */}
                  <Progress
                    value={g.total > 0 ? (g.paid / g.total) * 100 : 0}
                    className="h-2.5 bg-muted"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {g.paid.toLocaleString("fr-FR")} € versé · {g.remaining.toLocaleString("fr-FR")} € restant
                    </span>
                    <span>({g.paidCount}/{g.totalCount} mensualités)</span>
                  </div>
                </div>
              ))}

              <div className="flex justify-between text-sm font-semibold pt-1">
                <span className={totalPct > 100 ? "text-destructive" : "text-foreground"}>
                  Total : {totalPct}%
                </span>
                <span className="text-foreground">{totalAmount.toLocaleString("fr-FR")} €</span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Add commission form */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4" /> Ajouter une commission
          </h4>

          <div className="space-y-2">
            <Label>Type de bénéficiaire</Label>
            <Select value={beneficiaryType} onValueChange={(v) => { setBeneficiaryType(v as any); setSelectedUserId(""); setSelectedRole(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="collaborateur">Collaborateur</SelectItem>
                <SelectItem value="apporteur">Apporteur</SelectItem>
                <SelectItem value="agence">Agence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bénéficiaire</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un bénéficiaire" /></SelectTrigger>
              <SelectContent>
                {profiles
                  .filter((p) => {
                    if (beneficiaryType === "collaborateur") return p.role === "collaborateur";
                    if (beneficiaryType === "apporteur") return p.role === "apporteur" || p.is_also_apporteur;
                    if (beneficiaryType === "agence") return p.role === "agence";
                    return false;
                  })
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                {beneficiaryType === "collaborateur" && (
                  <>
                    <SelectItem value="setter">Setter</SelectItem>
                    <SelectItem value="closer">Closer</SelectItem>
                  </>
                )}
                {beneficiaryType === "apporteur" && (
                  <SelectItem value="apporteur">Apporteur</SelectItem>
                )}
                {beneficiaryType === "agence" && (
                  <SelectItem value="agence marketing">Agence marketing</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pourcentage (%)</Label>
            <Input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="0" />
          </div>

          <Button
            onClick={handleAdd}
            disabled={adding || !selectedRole || !percentage || !selectedUserId}
            className="w-full"
          >
            {adding ? "Ajout…" : "Ajouter la commission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
