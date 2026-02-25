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
import { Trash2, Plus } from "lucide-react";

interface Commission {
  id: string;
  beneficiary_user_id: string | null;
  beneficiary_external: string | null;
  role: string;
  percentage: number;
  amount: number | null;
  status: string | null;
  beneficiary_name?: string;
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
  const [beneficiaryType, setBeneficiaryType] = useState<"collaborateur" | "apporteur" | "skalesy">("collaborateur");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [percentage, setPercentage] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCommissions = useCallback(async () => {
    if (!saleId) return;
    setLoading(true);
    const { data } = await supabase
      .from("commissions")
      .select("id, beneficiary_user_id, beneficiary_external, role, percentage, amount, status")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: true });

    if (data) {
      // Enrich with profile names
      const userIds = data.filter((c) => c.beneficiary_user_id).map((c) => c.beneficiary_user_id!);
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
        if (profs) profileMap = Object.fromEntries(profs.map((p) => [p.id, p.full_name]));
      }
      setCommissions(
        data.map((c) => ({
          ...c,
          beneficiary_name: c.beneficiary_user_id
            ? profileMap[c.beneficiary_user_id] || "Inconnu"
            : c.beneficiary_external || "Externe",
        }))
      );
    }
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

  // Auto-calculate amount when percentage changes
  useEffect(() => {
    if (percentage) {
      setAmount(String(Math.round(saleAmountHt * parseFloat(percentage) / 100)));
    }
  }, [percentage, saleAmountHt]);

  // Suggest percentage when role changes
  useEffect(() => {
    if (selectedRole && ROLE_SUGGESTED_PCT[selectedRole]) {
      setPercentage(String(ROLE_SUGGESTED_PCT[selectedRole]));
    }
  }, [selectedRole]);

  const resetForm = () => {
    setBeneficiaryType("collaborateur");
    setSelectedUserId("");
    setSelectedRole("");
    setPercentage("");
    setAmount("");
  };

  const handleAdd = async () => {
    if (!saleId || !selectedRole || !percentage || !amount) return;
    setAdding(true);
    try {
      const isUser = beneficiaryType !== "skalesy";

      const { error } = await supabase.from("commissions").insert({
        sale_id: saleId,
        beneficiary_user_id: isUser ? selectedUserId : null,
        beneficiary_external: beneficiaryType === "skalesy" ? "Skalesy" : null,
        role: selectedRole,
        percentage: parseFloat(percentage),
        amount: parseFloat(amount),
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

  const handleDelete = async (id: string) => {
    await supabase.from("commissions").delete().eq("id", id);
    toast({ title: "Commission supprimée" });
    fetchCommissions();
    onUpdated();
  };

  const totalPct = commissions.reduce((s, c) => s + c.percentage, 0);
  const totalAmount = commissions.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Commissions — {saleProduct}</DialogTitle>
          <DialogDescription>Montant HT : {saleAmountHt.toLocaleString("fr-FR")} €</DialogDescription>
        </DialogHeader>

        {/* Existing commissions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Commissions actuelles</h4>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune commission enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/20">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{c.beneficiary_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className={`text-xs ${ROLE_COLORS[c.role] || ""}`}>
                          {c.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{c.percentage}%</span>
                        <span className="text-xs font-semibold text-foreground">{c.amount?.toLocaleString("fr-FR")} €</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                <SelectItem value="skalesy">Skalesy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {beneficiaryType === "collaborateur" && (
            <div className="space-y-2">
              <Label>Bénéficiaire</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un collaborateur" /></SelectTrigger>
                <SelectContent>
                  {profiles.filter((p) => p.role === "collaborateur").map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {beneficiaryType === "apporteur" && (
            <div className="space-y-2">
              <Label>Bénéficiaire</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un apporteur" /></SelectTrigger>
                <SelectContent>
                  {profiles.filter((p) => p.role === "apporteur" || p.is_also_apporteur).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {beneficiaryType === "skalesy" && (
            <p className="text-sm text-muted-foreground">Bénéficiaire : Skalesy (externe)</p>
          )}

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
                {beneficiaryType === "skalesy" && (
                  <SelectItem value="agence marketing">Agence marketing</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pourcentage (%)</Label>
              <Input type="number" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Montant (€)</Label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={adding || !selectedRole || !percentage || !amount || (beneficiaryType !== "skalesy" && !selectedUserId)}
            className="w-full"
          >
            {adding ? "Ajout…" : "Ajouter la commission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
