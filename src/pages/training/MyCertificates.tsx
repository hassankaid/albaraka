import { useNavigate } from "react-router-dom";
import { Award, Download, Copy, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { useMyCertificates, downloadCertificateById } from "@/hooks/useCertificates";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVerifyUrl } from "@/lib/downloadCertificatePdf";
import { useState } from "react";

export default function MyCertificates() {
  const navigate = useNavigate();
  const { data, isLoading } = useMyCertificates();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string, number: string) => {
    try {
      setDownloadingId(id);
      await downloadCertificateById(id, `${number}.pdf`);
    } catch (err: any) {
      toast.error(err?.message ?? "Téléchargement échoué");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCopyVerifyLink = async (number: string) => {
    await navigator.clipboard.writeText(getVerifyUrl(number));
    toast.success("Lien de vérification copié");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Award className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Mes certificats</h2>
          <p className="text-sm text-muted-foreground">
            Les formations que tu as validées avec El Baraka Training
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && (data?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            Aucun certificat pour l'instant
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-4">
            Termine une formation à 100 % pour obtenir ton certificat El Baraka Training.
          </p>
          <Button variant="outline" onClick={() => navigate("/training")}>
            Voir mes formations
          </Button>
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-neutral-950 to-neutral-900 text-amber-50"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-400" />
                    <span className="text-[10px] uppercase tracking-widest text-amber-400/80">
                      Certificat El Baraka
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400/70">
                    {c.certificate_number}
                  </span>
                </div>
                <CardTitle className="text-lg font-serif text-amber-50 mt-2">
                  {c.formation.titre}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-amber-100/60">
                  Émis le{" "}
                  {new Date(c.issued_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 border-0"
                    onClick={() => handleDownload(c.id, c.certificate_number)}
                    disabled={downloadingId === c.id}
                  >
                    <Download className="h-4 w-4" />
                    {downloadingId === c.id ? "..." : "Télécharger"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 border-amber-500/40 text-amber-200 bg-transparent hover:bg-amber-500/10"
                    onClick={() => handleCopyVerifyLink(c.certificate_number)}
                  >
                    <Copy className="h-4 w-4" />
                    Copier le lien
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
