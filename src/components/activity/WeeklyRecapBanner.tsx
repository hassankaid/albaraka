import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface WeeklyRecapBannerProps {
  recap: {
    week_start: string;
    recap_text: string;
    stats: any;
  };
  onDismiss: () => void;
}

export function WeeklyRecapBanner({ recap, onDismiss }: WeeklyRecapBannerProps) {
  const weekStart = new Date(recap.week_start);
  const stats = recap.stats || {};

  return (
    <Card className="border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-background to-background">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-base">Bilan de ta semaine</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Semaine du {format(weekStart, "d MMMM", { locale: fr })} —{" "}
                {stats.days_filled ?? 0}/7 jours saisis
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          {recap.recap_text.split("\n").filter(Boolean).map((line, i) => {
            const html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
            return <p key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
