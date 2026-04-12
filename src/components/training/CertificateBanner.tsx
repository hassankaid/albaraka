import { useEffect, useState } from "react";
import { Award, Download, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  useCertificateForFormation,
  useIssueCertificate,
  downloadCertificateById,
} from "@/hooks/useCertificates";
import { getVerifyUrl } from "@/lib/downloadCertificatePdf";
import { isFormationCompleteForUser } from "@/lib/certificateEligibility";

interface Props {
  userId: string;
  formationId: string;
  isComplete: boolean;
}

export function CertificateBanner({ userId, formationId, isComplete }: Props) {
  const { data: cert, isLoading, refetch } = useCertificateForFormation(formationId);
  const issueMutation = useIssueCertificate();
  const [autoChecked, setAutoChecked] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (autoChecked) return;
    if (isLoading) return;
    if (cert) {
      setAutoChecked(true);
      return;
    }
    if (!isComplete) {
      setAutoChecked(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const eligible = await isFormationCompleteForUser(userId, formationId);
        if (cancelled) return;
        if (eligible) {
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
        }
      } catch (err: any) {
        if (!cancelled) {
          console.warn("Auto-émission certificat:", err?.message ?? err);
        }
      } finally {
        if (!cancelled) setAutoChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cert, isLoading, isComplete, userId, formationId]);

  if (isLoading) return null;

  const isIssuing = issueMutation.isPending;

  if (!cert) {
    if (!isComplete) return null;
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
