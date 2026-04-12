import { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAllCertificates, downloadCertificateById } from "@/hooks/useCertificates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Download, Search, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function AdminCertificates() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "all" | "revoked">("active");

  const { data: certificates, isLoading } = useAllCertificates({
    includeRevoked: statusFilter !== "active",
  });

  const { data: formations } = useQuery({
    queryKey: ["admin", "formations-for-cert-filter"],
    queryFn: async () => {
      const { data } = await supabase.from("formations").select("id, titre").order("titre");
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    let list = certificates ?? [];
    if (formationFilter !== "all") {
      list = list.filter((c) => c.formation_id === formationFilter);
    }
    if (statusFilter === "revoked") {
      list = list.filter((c) => c.revoked_at !== null);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.certificate_number.toLowerCase().includes(q) ||
          c.user?.full_name?.toLowerCase().includes(q) ||
          c.user?.email?.toLowerCase().includes(q) ||
          c.formation?.titre?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [certificates, search, formationFilter, statusFilter]);

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  const handleExport = () => {
    const header = ["Numero", "Eleve", "Email", "Formation", "Emis le", "Source", "Statut"];
    const rows = filtered.map((c) => [
      c.certificate_number,
      c.user?.full_name ?? "",
      c.user?.email ?? "",
      c.formation?.titre ?? "",
      format(new Date(c.issued_at), "dd/MM/yyyy"),
      c.issue_source,
      c.revoked_at ? "Revoque" : "Valide",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificats-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (id: string, number: string) => {
    try {
      await downloadCertificateById(id, `${number}.pdf`);
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement échoué");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/training/manage")}
          className="gap-2 -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au hub formation
        </Button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Award className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading">Certificats Al Baraka</h1>
              <p className="text-sm text-muted-foreground">
                Tous les certificats émis · {certificates?.length ?? 0} au total
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="N°, élève, email, formation…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={formationFilter} onValueChange={setFormationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les formations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formations</SelectItem>
                {(formations ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Valides uniquement</SelectItem>
                <SelectItem value="all">Tous (incl. révoqués)</SelectItem>
                <SelectItem value="revoked">Révoqués uniquement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Élève</TableHead>
                  <TableHead>Formation</TableHead>
                  <TableHead>Émis le</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Chargement…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Aucun certificat ne correspond aux filtres.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.certificate_number}</TableCell>
                    <TableCell>
                      <button
                        className="text-left hover:underline"
                        onClick={() => navigate(`/admin/training/students/${c.user_id}`)}
                      >
                        <div className="text-sm">{c.user?.full_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.user?.email}</div>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{c.formation?.titre ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(c.issued_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.issue_source === "auto" ? "Auto" : "Manuel"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.revoked_at ? (
                        <Badge variant="destructive" className="text-xs">
                          Révoqué
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-emerald-600 hover:bg-emerald-600">
                          Valide
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-7"
                        onClick={() => handleDownload(c.id, c.certificate_number)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
