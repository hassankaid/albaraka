import { useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStudentsList, type StudentSummary } from "@/hooks/useStudentTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Users, Trophy, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ActivityFilter = "all" | "active" | "moderate" | "inactive" | "completed";

function getActivityStatus(student: StudentSummary): {
  label: string;
  emoji: string;
  color: string;
  filter: ActivityFilter;
} {
  // Completed: 100% formations + tous quiz validés
  if (
    student.global_progress_pct >= 100 &&
    student.quiz_attempted_count > 0 &&
    student.quiz_validated_count === student.quiz_attempted_count
  ) {
    return { label: "Terminé", emoji: "🏆", color: "text-amber-500", filter: "completed" };
  }

  if (!student.last_activity_at) {
    return { label: "Jamais", emoji: "⚪", color: "text-muted-foreground", filter: "inactive" };
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(student.last_activity_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSince <= 7) return { label: "Actif", emoji: "🟢", color: "text-emerald-500", filter: "active" };
  if (daysSince <= 30) return { label: "Modéré", emoji: "🟡", color: "text-amber-500", filter: "moderate" };
  return { label: "Inactif", emoji: "🔴", color: "text-red-500", filter: "inactive" };
}

export default function AdminStudentTracking() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: students, isLoading } = useStudentsList();

  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  if (profile?.role !== "ceo") {
    return <Navigate to="/training" replace />;
  }

  // Build formation filter options
  const allFormations = useMemo(() => {
    const map = new Map<string, string>();
    (students || []).forEach((s) =>
      s.formations.forEach((f) => map.set(f.id, f.titre))
    );
    return Array.from(map.entries()).map(([id, titre]) => ({ id, titre }));
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const term = search.trim().toLowerCase();
    return students.filter((s) => {
      // Search
      if (term) {
        const haystack = `${s.full_name || ""} ${s.email || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      // Formation filter
      if (formationFilter !== "all") {
        if (!s.formations.some((f) => f.id === formationFilter)) return false;
      }
      // Activity filter
      if (activityFilter !== "all") {
        if (getActivityStatus(s).filter !== activityFilter) return false;
      }
      return true;
    });
  }, [students, search, formationFilter, activityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Suivi Élèves
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des élèves enrôlés, leur progression et leurs quiz
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
            className="pl-9"
          />
        </div>
        <Select value={formationFilter} onValueChange={setFormationFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes formations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes formations</SelectItem>
            {allFormations.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.titre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as ActivityFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les états</SelectItem>
            <SelectItem value="active">🟢 Actif (&lt; 7j)</SelectItem>
            <SelectItem value="moderate">🟡 Modéré (7-30j)</SelectItem>
            <SelectItem value="inactive">🔴 Inactif (&gt; 30j)</SelectItem>
            <SelectItem value="completed">🏆 Terminé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && filteredStudents.length === 0 && (
        <Card>
          <CardContent className="py-24 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {students && students.length > 0
                ? "Aucun élève ne correspond aux filtres."
                : "Aucun élève enrôlé pour le moment."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!isLoading && filteredStudents.length > 0 && (
        <Card>
          <CardContent className="p-0">
            {/* Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-3 px-4 py-3 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="col-span-4">Élève</div>
              <div className="col-span-1 text-center">Formations</div>
              <div className="col-span-3">Progression</div>
              <div className="col-span-2 text-center">Quiz validés</div>
              <div className="col-span-2">Dernière activité</div>
            </div>

            {/* Rows */}
            {filteredStudents.map((s) => {
              const status = getActivityStatus(s);
              return (
                <div
                  key={s.user_id}
                  onClick={() => navigate(`/admin/training/students/${s.user_id}`)}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-4 border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer transition-colors group"
                >
                  {/* Élève */}
                  <div className="col-span-4 flex items-center gap-3">
                    <span className="text-xl">{status.emoji}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {s.full_name || s.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                    </div>
                  </div>

                  {/* Formations count */}
                  <div className="col-span-1 flex items-center justify-start md:justify-center">
                    <Badge variant="outline" className="text-xs">
                      {s.enrollments_count}
                    </Badge>
                  </div>

                  {/* Progression */}
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <Progress
                        value={s.global_progress_pct}
                        className={cn(
                          "h-2",
                          s.global_progress_pct >= 100 && "[&>div]:bg-emerald-500"
                        )}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {s.total_chapters_done}/{s.total_chapters} chapitres • {s.global_progress_pct}%
                      </p>
                    </div>
                  </div>

                  {/* Quiz */}
                  <div className="col-span-2 flex items-center justify-start md:justify-center">
                    {s.quiz_attempted_count > 0 ? (
                      <Badge
                        variant={
                          s.quiz_validated_count === s.quiz_attempted_count
                            ? "default"
                            : "secondary"
                        }
                        className={cn(
                          "text-xs",
                          s.quiz_validated_count === s.quiz_attempted_count &&
                            "bg-emerald-600 hover:bg-emerald-600"
                        )}
                      >
                        {s.quiz_validated_count}/{s.quiz_attempted_count}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Dernière activité */}
                  <div className="col-span-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {s.last_activity_at
                        ? formatDistanceToNow(new Date(s.last_activity_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : "—"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
