import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Copy, Download, Loader2, PartyPopper, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useIssueCertificate, downloadCertificateById } from "@/hooks/useCertificates";
import { getVerifyUrl } from "@/lib/downloadCertificatePdf";
import alBarakaLogo from "@/assets/al-baraka-logo.png";

type State = "generating" | "ready" | "error";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  formationId: string;
  formationTitle: string;
  firstName: string;
}

export function FormationCompletionModal({
  open,
  onOpenChange,
  userId,
  formationId,
  formationTitle,
  firstName,
}: Props) {
  const [state, setState] = useState<State>("generating");
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [certId, setCertId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const issueCertificate = useIssueCertificate();

  const runIssue = async () => {
    setState("generating");
    setErrorMsg(null);
    try {
      const res = await issueCertificate.mutateAsync({
        user_id: userId,
        formation_id: formationId,
        source: "auto",
      });
      setCertId(res.certificate_id);
      setCertNumber(res.certificate_number);
      setState("ready");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Génération échouée");
      setState("error");
    }
  };

  useEffect(() => {
    if (open && state === "generating" && !certNumber && !issueCertificate.isPending) {
      runIssue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      // Reset on close so a re-open would re-issue cleanly if needed
      setState("generating");
      setCertNumber(null);
      setCertId(null);
      setErrorMsg(null);
    }
  }, [open]);

  const handleDownload = async () => {
    if (!certId || !certNumber) return;
    try {
      setDownloading(true);
      await downloadCertificateById(certId, `${certNumber}.pdf`);
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement échoué");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!certNumber) return;
    await navigator.clipboard.writeText(getVerifyUrl(certNumber));
    toast.success("Lien de vérification copié");
  };

  // Allow close only in ready/error states
  const canClose = state !== "generating";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !canClose) return;
        onOpenChange(v);
      }}
    >
      <DialogContent
        className="max-w-lg border-amber-500/40 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-amber-50 overflow-hidden p-0"
        onInteractOutside={(e) => {
          if (!canClose) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!canClose) e.preventDefault();
        }}
      >
        <div className="relative">
          <div className="absolute inset-3 border border-amber-500/20 rounded pointer-events-none" />

          <div className="relative p-8 flex flex-col items-center text-center space-y-5">
            <img src={alBarakaLogo} alt="El Baraka" className="h-14 w-14 object-contain" />
            <div className="text-[10px] tracking-[0.35em] uppercase text-amber-400/80 font-serif">
              El Baraka Training
            </div>
            <div className="h-px w-20 bg-amber-500/60" />

            {state === "generating" && (
              <>
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-amber-500/20" />
                  <Loader2 className="relative h-10 w-10 text-amber-400 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-3xl text-amber-100">
                    Félicitations{firstName ? `, ${firstName}` : ""} !
                  </h2>
                  <p className="text-sm text-amber-100/80">
                    Tu viens de terminer la formation
                  </p>
                  <p className="font-serif italic text-xl text-amber-300">
                    « {formationTitle} »
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-amber-400/70 pt-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ton certificat El Baraka est en cours de préparation…
                </div>
              </>
            )}

            {state === "ready" && (
              <>
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-amber-500/15" />
                  <div className="absolute inset-2 rounded-full bg-amber-500/25" />
                  <Award className="relative h-10 w-10 text-amber-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-3xl text-amber-100 flex items-center justify-center gap-2">
                    <PartyPopper className="h-6 w-6 text-amber-400" />
                    Ton certificat est prêt !
                  </h2>
                  <p className="text-sm text-amber-100/80">
                    Formation <span className="italic text-amber-300">« {formationTitle} »</span>
                  </p>
                  {certNumber && (
                    <p className="text-[11px] font-mono text-amber-400/70 pt-1">
                      N° {certNumber}
                    </p>
                  )}
                </div>

                <div className="w-full space-y-2 pt-2">
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 border-0 font-semibold"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                    Télécharger mon certificat
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-amber-500/40 text-amber-200 bg-transparent hover:bg-amber-500/10"
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                    Copier le lien de vérification
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-amber-200/70 hover:text-amber-100 hover:bg-transparent"
                    onClick={() => onOpenChange(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </>
            )}

            {state === "error" && (
              <>
                <div className="relative h-20 w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-red-500/15" />
                  <RefreshCw className="relative h-10 w-10 text-red-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-serif text-2xl text-amber-100">
                    Un souci est survenu
                  </h2>
                  <p className="text-sm text-amber-100/80 max-w-sm">
                    {errorMsg ?? "La génération du certificat a échoué."}
                  </p>
                </div>
                <div className="w-full space-y-2 pt-2">
                  <Button
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 border-0"
                    onClick={runIssue}
                    disabled={issueCertificate.isPending}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Réessayer
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-amber-200/70 hover:text-amber-100 hover:bg-transparent"
                    onClick={() => onOpenChange(false)}
                  >
                    Fermer
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
