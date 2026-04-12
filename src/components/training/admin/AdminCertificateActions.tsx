import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Download, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useIssueCertificate,
  useRevokeCertificate,
  downloadCertificateById,
} from "@/hooks/useCertificates";

interface Props {
  userId: string;
  formationId: string;
  isComplete: boolean;
}

export function AdminCertificateActions({ userId, formationId, isComplete }: Props) {
  const { data: cert, isLoading, refetch } = useQuery({
    queryKey: ["certificates", "admin-for-user-formation", userId, formationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formation_certificates")
        .select("id, certificate_number, issued_at, issued_by, issue_source, pdf_storage_path, revoked_at")
        .eq("user_id", userId)
        .eq("formation_id", formationId)
        .is("revoked_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const issueMutation = useIssueCertificate();
  const revokeMutation = useRevokeCertificate();
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [downloading, setDownloading] = useState(false);

  if (isLoading) return null;

  const handleIssue = async () => {
    try {
      await issueMutation.mutateAsync({
        user_id: userId,
        formation_id: formationId,
        source: "manual",
      });
      toast.success("Certificat émis.");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Émission échouée");
    }
  };

  const handleDownload = async () => {
    if (!cert) return;
    try {
      setDownloading(true);
      await downloadCertificateById(cert.id, `${cert.certificate_number}.pdf`);
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement échoué");
    } finally {
      setDownloading(false);
    }
  };

  const handleRevoke = async () => {
    if (!cert) return;
    try {
      await revokeMutation.mutateAsync({
        certificateId: cert.id,
        reason: reason.trim() || "Révoqué par l'administrateur",
      });
      toast.success("Certificat révoqué.");
      setRevokeOpen(false);
      setReason("");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Révocation échouée");
    }
  };

  if (!cert) {
    if (!isComplete) {
      return (
        <p className="text-xs text-muted-foreground italic">
          Certificat disponible à 100 % de complétion.
        </p>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
        onClick={handleIssue}
        disabled={issueMutation.isPending}
      >
        {issueMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Émettre le certificat
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 font-mono">
          <Award className="h-3.5 w-3.5" />
          {cert.certificate_number}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="h-3 w-3" />
          {downloading ? "..." : "PDF"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => setRevokeOpen(true)}
        >
          <ShieldAlert className="h-3 w-3" />
          Révoquer
        </Button>
      </div>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer ce certificat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le certificat {cert.certificate_number} ne sera plus considéré comme valide. La page de
              vérification publique affichera "Révoqué".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label>Motif (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Raison de la révocation…"
              rows={2}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Révoquer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
