// « Mon tunnel » (Sidali, 13/10/2026) : beaucoup d'élèves ne trouvaient pas leur
// lien, rangé au milieu du Dashboard. Il a désormais sa propre entrée de menu.
import { Navigate } from "react-router-dom";
import QuizLinkCard from "@/pages/apporteur/QuizLinkCard";
import { useAccesTunnel } from "@/hooks/useAccesTunnel";

export default function MonTunnel() {
  const { aAcces, isLoading } = useAccesTunnel();
  if (!isLoading && !aAcces) return <Navigate to="/my-space" replace />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon tunnel</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ton lien personnel à partager à tes prospects : ils répondent au quiz, puis te contactent sur WhatsApp.
        </p>
      </div>
      <QuizLinkCard />
    </div>
  );
}
