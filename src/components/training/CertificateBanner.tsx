import { useEffect, useState } from "react";
import { Award, Download, Copy, Loader2, Sparkles, AlertCircle, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  useCertificateForFormation,
  useIssueCertificate,
  downloadCertificateById,
} from "@/hooks/useCertificates";
import { getVerifyUrl } from "@/lib/downloadCertificatePdf";
import { isFormationCompleteForUser } from "@/lib/certificateEligibility";
import { useAuth } from "@/hooks/useAuth";
import { useMissingFormationQuizzes } from "@/hooks/useQuizzes";

interface Props {
  userId: string;
  formationId: string;
  isComplete: boolean;
}

export function CertificateBanner({ userId, formationId, isComplete }: Props) {
  const { profile } = useAuth();
  const isCeo = profile?.role === "ceo";
  const navigate = useNavigate();
  const { data: cert, isLoading, refetch } = useCertificateForFormation(formationId);
  const { data: missingQuizzes } = useMissingFormationQuizzes(
    isComplete && !cert ? formationId : null,
  );
  // Slug de la formation pour construire les URLs vers les chapitres
  const { data: formationSlug } = useQuery({
    queryKey: ["formation-slug", formationId],
    enabled: !!formationId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("formations")
        .select("slug")
        .eq("id", formationId)
        .maybeSingle();
      return (data?.slug ?? null) as string | null;
    },
  });
  const issueMutation = useIssueCertificate();
  const [autoChecked, setAutoChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (autoChecked) return;
    if (isLoading) return;
    if (isCeo) {
      // Le CEO ne reçoit pas de certificat — pas d'auto-émission
      setAutoChecked(true);
      return;
    }
    if (cert) {
      setAutoChecked(true);
      return;
    }
    if (!isComplete) {
      setAutoChecked(true);
      return;
    }
    let cancelled = false;

    const tryIssue = async (attempt: number): Promise<void> => {
      try {
        const eligible = await isFormationCompleteForUser(userId, formationId);
        if (cancelled) return;
        if (!eligible) return;
        await issueMutation.mutateAsync({
          user_id: userId,
          formation_id: formationId,
          source: "auto",
        });
        if (!cancelled) {
          toast.success("Ton certificat est prêt !", {
            description: "Tu peux le télécharger depuis cette formation.",
          });
          await refetch();
        }
      } catch (err: any) {
        if (cancelled) return;
        console.warn(`Auto-émission certificat (tentative ${attempt}):`, err?.message ?? err);
        // Retry unique après 3s si c'est la 1re tentative
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 3000));
          if (!cancelled) await tryIssue(attempt + 1);
        } else {
          // Échec définitif → afficher à l'utilisateur
          toast.error("Génération du certificat en échec", {
            description: "Essaie de recharger la page, ou contacte l'équipe si le problème persiste.",
          });
        }
      }
    };

    (async () => {
      await tryIssue(1);
      if (!cancelled) setAutoChecked(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert, isLoading, isComplete, userId, formationId, isCeo]);

  // CEO : ne rien afficher (pas de bannière de certificat)
  if (isCeo) return null;

  if (isLoading) return null;

  const isIssuing = issueMutation.isPending;

  if (!cert) {
    if (!isComplete) return null;

    // Si des quiz manquent, on affiche le vrai blocage avec la liste
    const hasMissing = (missingQuizzes?.length ?? 0) > 0;
    if (hasMissing && !isIssuing) {
      return (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-500/15 shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Ton certificat t'attend — il reste {missingQuizzes!.length} quiz à valider
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toutes les vidéos sont vues. Valide les quiz ci-dessous pour recevoir ton certificat et débloquer la suite du parcours.
              </p>
            </div>
          </div>
          <div className="space-y-1.5 pl-11">
            {missingQuizzes!.map((q) => (
              <button
                key={q.quiz_id}
                onClick={() => {
                  if (q.chapitre_id && formationSlug) {
                    navigate(`/training/${formationSlug}/chapitre/${q.chapitre_id}`);
                  } else {
                    navigate(`/training/quiz/${q.quiz_id}`);
                  }
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors text-left"
              >
                <PlayCircle className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {q.quiz_titre}
                  </p>
                  {q.chapitre_titre && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      Se trouve sous le chapitre : {q.chapitre_titre}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-primary font-medium">Y aller →</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-amber-500/30 bg-gradient-to-br from-neutral-950 to-neutral-900 p-5 text-amber-50 flex items-center gap-4">
        {isIssuing ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : (
          <Sparkles className="h-5 w-5 text-amber-400" />
        )}
        <div className="flex-1">
          <p className="text-sm">
            {isIssuing
              ? "Génération de ton certificat en cours…"
              : "Tu as terminé cette formation. Ton certificat est en cours de préparation."}
          </p>
        </div>
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadCertificateById(cert.id, `${cert.certificate_number}.pdf`);
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement échoué");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getVerifyUrl(cert.certificate_number));
    toast.success("Lien de vérification copié");
  };

  return (
    <div className="relative rounded-lg border border-amber-500/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 p-6 text-amber-50 overflow-hidden">
      <div className="absolute inset-3 rounded-md border border-amber-500/20 pointer-events-none" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-3 rounded-full bg-amber-500/10 border border-amber-500/40">
            <Award className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-serif">
              Certificat Al Baraka Training
            </p>
            <p className="text-sm text-amber-100/90 mt-1">
              Félicitations — tu as validé cette formation.
            </p>
            <p className="text-[11px] text-amber-400/60 font-mono mt-1">
              N° {cert.certificate_number} · Émis le{" "}
              {new Date(cert.issued_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 border-0"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-4 w-4" />
            {downloading ? "..." : "Télécharger"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-amber-500/40 text-amber-200 bg-transparent hover:bg-amber-500/10"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4" />
            Copier le lien
          </Button>
        </div>
      </div>
    </div>
  );
}
