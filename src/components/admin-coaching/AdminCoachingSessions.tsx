import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminCoachingSessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: types } = useQuery({
    queryKey: ["admin-types-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, label")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["admin-all-sessions", filterType, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("coaching_sessions")
        .select(`
          *,
          coach_type:coach_types(id, label, theme_color),
          student:profiles!coaching_sessions_student_user_id_fkey(id, email, full_name),
          coach:profiles!coaching_sessions_coach_user_id_fkey(id, email, full_name)
        `)
        .order("session_date", { ascending: false })
        .limit(100);

      if (filterType !== "all") {
        query = query.eq("coach_type_id", filterType);
      }
      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteSession = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("coaching_scores").delete().eq("session_id", id);
      const { error } = await supabase.from("coaching_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-sessions"] });
      toast({ title: "Session supprimée" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg">Toutes les sessions</CardTitle>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="completed">Terminées</SelectItem>
                  <SelectItem value="draft">Brouillons</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.session_date), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: (session.coach_type as any)?.theme_color }}
                      />
                      {(session.coach_type as any)?.label}
                    </div>
                  </TableCell>
                  <TableCell>{(session.student as any)?.full_name || (session.student as any)?.email}</TableCell>
                  <TableCell>{(session.coach as any)?.full_name || (session.coach as any)?.email}</TableCell>
                  <TableCell>
                    {session.global_score ? (
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        {session.global_score.toFixed(1)}/5
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === "completed" ? "default" : "secondary"}>
                      {session.status === "completed" ? "Terminée" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm("Supprimer cette session ?")) {
                          deleteSession.mutate(session.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sessions?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucune session trouvée.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
