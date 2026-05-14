import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Users, PlayCircle, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatParisWeekdayDate } from "@/lib/coaching-slots";
import {
  useRecentOccurrences,
  useUpsertOccurrenceReplay,
  useAttendanceLeaderboard,
  type ExpectedOccurrence,
} from "@/hooks/useAdminCoachingReplays";
import { useCoachingSlots } from "@/hooks/useCoachingSlots";

export default function AdminCoachingReplays() {
  const { data: occurrences, isLoading } = useRecentOccurrences(12);
  const { data: leaderboard } = useAttendanceLeaderboard(30);
  const { data: coachingSlots } = useCoachingSlots();

  const slotStats = useMemo(() => {
    if (!occurrences || !coachingSlots) return [];
    return coachingSlots.map((slot) => {
      const slotOccs = occurrences.filter((o) => o.slot?.id === slot.id);
      const totalAttendance = slotOccs.reduce((sum, o) => sum + o.attendanceCount, 0);
      const avg = slotOccs.length > 0 ? Math.round(totalAttendance / slotOccs.length) : 0;
      return { slot, avg, total: slotOccs.length };
    });
  }, [occurrences, coachingSlots]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {slotStats.map(({ slot, avg }) => (
          <Card key={slot.id}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">
                {slot.emoji} {slot.title}
              </div>
              <div className="text-2xl font-semibold mt-1">{avg}</div>
              <div className="text-xs text-muted-foreground">
                présents / séance (30 j)
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" /> Replays & occurrences récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Créneau</TableHead>
                  <TableHead className="text-center">Présents</TableHead>
                  <TableHead className="text-center">Replays vus</TableHead>
                  <TableHead>Lien replay</TableHead>
                  <TableHead>Mot de passe</TableHead>
                  <TableHead className="w-[1%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(occurrences ?? []).map((occ) => (
                  <OccurrenceRow key={`${occ.slot.id}-${occ.occurrenceDate}`} occ={occ} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" /> Leaderboard assiduité (30 derniers jours)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Trié par taux d'assiduité croissant — les élèves les moins sérieux en haut.
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Pass</TableHead>
                <TableHead className="text-center">Présents</TableHead>
                <TableHead className="text-center">Replays</TableHead>
                <TableHead className="text-right">Assiduité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(leaderboard ?? []).map((row) => (
                <TableRow key={row.user_id}>
                  <TableCell>
                    <div className="font-medium">{row.full_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {row.pass_level === "liberty" ? "Liberty" : "AL BARAKA"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {row.attendedCount}/{row.eligibleCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{row.replayViewsCount}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <Badge
                      variant={
                        row.attendanceRate >= 70
                          ? "default"
                          : row.attendanceRate >= 40
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {row.attendanceRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {leaderboard && leaderboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Aucun élève éligible (pass AL BARAKA / Liberty actif requis).
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function OccurrenceRow({ occ }: { occ: ExpectedOccurrence }) {
  const [url, setUrl] = useState(occ.row?.replay_url ?? "");
  const [pwd, setPwd] = useState(occ.row?.replay_password ?? "");
  const upsert = useUpsertOccurrenceReplay();
  const { toast } = useToast();

  const dirty = url !== (occ.row?.replay_url ?? "") || pwd !== (occ.row?.replay_password ?? "");

  async function save() {
    try {
      await upsert.mutateAsync({
        slot: occ.slot,
        occurrenceDate: occ.occurrenceDate,
        startedAt: occ.startedAt,
        replayUrl: url,
        replayPassword: pwd,
      });
      toast({ title: "Replay enregistré", description: `Disponible 30 jours.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message ?? String(e), variant: "destructive" });
    }
  }

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap capitalize">
        {formatParisWeekdayDate(occ.startedAt)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <span>{occ.slot.emoji}</span>
          <span className="font-medium">{occ.slot.title}</span>
        </div>
        <div className="text-xs text-muted-foreground">{occ.slot.coach}</div>
      </TableCell>
      <TableCell className="text-center">{occ.attendanceCount}</TableCell>
      <TableCell className="text-center">{occ.replayViewsCount}</TableCell>
      <TableCell>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="min-w-[240px]"
        />
      </TableCell>
      <TableCell>
        <Input
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Code"
          className="min-w-[120px]"
        />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          onClick={save}
          disabled={!dirty || upsert.isPending}
        >
          {upsert.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </TableCell>
    </TableRow>
  );
}
