// AdminLeadScoring — dashboard CEO (phase test) pour visualiser toutes les
// soumissions au quiz lead scoring : score, catégorie, flags, réponses
// détaillées par question. Lecture seule.
//
// Phase test : isolé de la table /leads, visible uniquement par CEO.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles, RefreshCw, Search, FileQuestion, Mail, Phone,
  Calendar as CalendarIcon, Filter, AlertCircle, AlertTriangle,
} from "lucide-react";
import {
  QUIZ_QUESTIONS,
  CATEGORY_LABELS,
  CATEGORY_DETAILS,
  CATEGORY_EMOJIS,
  CATEGORY_BADGES,
  FLAG_LABELS,
  type Category,
} from "@/lib/leadScoring";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ScoringResponse {
  id: string;
  funnel_slug: string;
  pending_token_id: string | null;
  contact_email: string;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_phone: string | null;
  answers: Record<string, string>;
  score: number;
  category: Category;
  flags: string[];
  client_ip: string | null;
  user_agent: string | null;
  created_at: string;
  completed_at: string;
}

interface FunnelConfig {
  slug: string;
  name: string;
  thank_you_url: string;
  active: boolean;
}

const CATEGORIES: Category[] = ["chaud", "tiede", "froid", "hors_cible"];

export default function AdminLeadScoring() {
  const { profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<ScoringResponse[]>([]);
  const [funnels, setFunnels] = useState<FunnelConfig[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<"all" | Category>("all");
  const [filterFunnel, setFilterFunnel] = useState<"all" | string>("all");
  const [openDetailId, setOpenDetailId] = useState<string | null>(null);

  const isCeo = profile?.role === "ceo";

  async function fetchAll() {
    setLoading(true);
    try {
      const [{ data: respData }, { data: funnelData }] = await Promise.all([
        supabase
          .from("lead_scoring_responses")
          .select("*")
          .order("completed_at", { ascending: false }),
        supabase
          .from("quiz_funnel_configs")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      setResponses((respData as ScoringResponse[]) || []);
      setFunnels((funnelData as FunnelConfig[]) || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isCeo) fetchAll();
  }, [isCeo]);

  const filtered = useMemo(() => {
    return responses.filter((r) => {
      if (filterCategory !== "all" && r.category !== filterCategory) return false;
      if (filterFunnel !== "all" && r.funnel_slug !== filterFunnel) return false;
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${r.contact_first_name || ""} ${r.contact_last_name || ""}`.toLowerCase();
        const haystack = [r.contact_email, fullName, r.contact_phone || ""].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [responses, search, filterCategory, filterFunnel]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      total: responses.length,
      chaud: 0,
      tiede: 0,
      froid: 0,
      hors_cible: 0,
      orphelins: 0,
    };
    for (const r of responses) {
      counts[r.category] = (counts[r.category] || 0) + 1;
      if (!r.pending_token_id) counts.orphelins += 1;
    }
    return counts;
  }, [responses]);

  const detailResponse = useMemo(
    () => responses.find((r) => r.id === openDetailId) || null,
    [openDetailId, responses],
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isCeo) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">Accès réservé au CEO</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Lead Scoring
            <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30 ml-2">
              Phase test
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} réponse{stats.total > 1 ? "s" : ""} · {stats.orphelins} orpheline{stats.orphelins > 1 ? "s" : ""} (matching manuel à faire)
          </p>
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
        </Button>
      </div>

      {/* Stats par catégorie */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CATEGORIES.map((cat) => (
          <Card key={cat} className="border-border/50">
            <CardContent className="p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {CATEGORY_EMOJIS[cat]} {CATEGORY_LABELS[cat]}
              </div>
              <div className="text-2xl font-bold mt-1 tabular-nums">{stats[cat] ?? 0}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {CATEGORY_DETAILS[cat]}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email ou tél…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterFunnel} onValueChange={setFilterFunnel}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous funnels</SelectItem>
            {funnels.map((f) => (
              <SelectItem key={f.slug} value={f.slug}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="p-8 text-center">
            <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium">Aucune réponse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les soumissions au quiz s'afficheront ici en temps réel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Lead</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Flags</TableHead>
                <TableHead>Funnel</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const fullName = `${r.contact_first_name || ""} ${r.contact_last_name || ""}`.trim();
                const orphelin = !r.pending_token_id;
                return (
                  <TableRow
                    key={r.id}
                    className="border-border hover:bg-secondary/40 cursor-pointer"
                    onClick={() => setOpenDetailId(r.id)}
                  >
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-foreground text-sm">{fullName || "—"}</p>
                            {orphelin && (
                              <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                                Orphelin
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {r.contact_email}
                          </p>
                          {r.contact_phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" /> {r.contact_phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-base tabular-nums">{r.score}</span>
                      <span className="text-xs text-muted-foreground">/70</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${CATEGORY_BADGES[r.category]}`}>
                        {CATEGORY_EMOJIS[r.category]} {CATEGORY_LABELS[r.category]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {r.flags.map((flag) => (
                          <Badge
                            key={flag}
                            variant="outline"
                            className="text-[9px] bg-muted/40 text-foreground/80 border-border"
                            title={FLAG_LABELS[flag] || flag}
                          >
                            {FLAG_LABELS[flag] || flag}
                          </Badge>
                        ))}
                        {r.flags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{r.funnel_slug}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-xs text-muted-foreground"
                        title={format(new Date(r.completed_at), "Pp", { locale: fr })}
                      >
                        {formatDistanceToNow(new Date(r.completed_at), { addSuffix: true, locale: fr })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        Détails
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Modal détail des réponses */}
      <Dialog open={!!detailResponse} onOpenChange={(o) => !o && setOpenDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span>Détail du diagnostic</span>
                {detailResponse && (
                  <Badge variant="outline" className={`text-xs ${CATEGORY_BADGES[detailResponse.category]}`}>
                    {CATEGORY_EMOJIS[detailResponse.category]} {CATEGORY_LABELS[detailResponse.category]} · {detailResponse.score}/70
                  </Badge>
                )}
              </div>
              {detailResponse && (
                <span className="text-sm text-muted-foreground font-normal">
                  {`${detailResponse.contact_first_name || ""} ${detailResponse.contact_last_name || ""}`.trim() || "—"}
                  {" — "}
                  <span className="font-mono text-xs">{detailResponse.contact_email}</span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {detailResponse && (
            <div className="space-y-4 pt-2">
              {/* Flags en haut */}
              {detailResponse.flags.length > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-amber-400 font-medium mb-2">
                    Alertes setter ({detailResponse.flags.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailResponse.flags.map((f) => (
                      <Badge
                        key={f}
                        variant="outline"
                        className="text-xs bg-amber-500/15 text-amber-300 border-amber-500/30"
                      >
                        {FLAG_LABELS[f] || f}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Réponses question par question */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Réponses (7 questions)
                </div>
                {QUIZ_QUESTIONS.map((q, idx) => {
                  const code = detailResponse.answers[q.id];
                  const opt = q.options.find((o) => o.code === code);
                  return (
                    <div key={q.id} className="rounded-md border border-border/60 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Question {idx + 1} · {q.title}
                      </p>
                      <p className="text-xs text-muted-foreground italic mb-2">{q.prompt}</p>
                      {opt ? (
                        <div className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-foreground">{opt.label}</span>
                          <span className="text-xs text-primary shrink-0 font-medium">+{opt.score} pts</span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Pas de réponse</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Métadonnées techniques */}
              <div className="rounded-md border border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-1 leading-relaxed">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3 w-3" />
                  Soumis le {format(new Date(detailResponse.completed_at), "Pp", { locale: fr })}
                </div>
                {detailResponse.client_ip && (
                  <div>IP : <code className="font-mono">{detailResponse.client_ip}</code></div>
                )}
                <div>Token : {detailResponse.pending_token_id ?
                  <span className="text-emerald-400">✓ Match auto réussi</span> :
                  <span className="text-amber-400">⚠ Orphelin (matching manuel)</span>
                }</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
