import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";

export default function CoachingSession() {
  const { sessionId } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Session de coaching</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-foreground">Session ID: {sessionId}</p>
          <p className="text-sm text-muted-foreground mt-2">
            L'interface de notation sera créée dans le prochain prompt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
