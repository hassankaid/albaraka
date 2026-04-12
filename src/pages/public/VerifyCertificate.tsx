import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react";
import alBarakaLogo from "@/assets/al-baraka-logo.png";

export default function VerifyCertificate() {
  const { number } = useParams<{ number: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["verify-certificate", number],
    enabled: !!number,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_certificates_view")
        .select("certificate_number, user_full_name, formation_titre, issued_at, revoked_at, is_revoked")
        .eq("certificate_number", number!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const status: "loading" | "valid" | "revoked" | "not_found" = isLoading
    ? "loading"
    : !data
    ? "not_found"
    : data.revoked_at
    ? "revoked"
    : "valid";

  return (
    <div className="min-h-screen bg-neutral-950 text-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="relative rounded-xl border-2 border-amber-500/40 bg-neutral-900/80 p-8 md:p-12 shadow-2xl">
          <div className="absolute inset-2 border border-amber-500/20 rounded-lg pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-6 relative">
            <img src={alBarakaLogo} alt="Al Baraka" className="h-20 w-auto object-contain" />
            <div className="text-[11px] tracking-[0.4em] uppercase text-amber-400/80 font-serif">
              Al Baraka Training
            </div>
            <div className="h-px w-20 bg-amber-500/60" />

            {status === "loading" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm text-amber-100/70">Vérification en cours…</p>
              </div>
            )}

            {status === "valid" && data && (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                  <span className="text-sm tracking-wide uppercase">Certificat authentique</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-amber-400/70 italic">Décerné à</p>
                  <h1 className="font-serif text-3xl md:text-4xl text-white">
                    {data.user_full_name}
                  </h1>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-amber-400/70 italic">Pour la formation</p>
                  <p className="font-serif italic text-xl md:text-2xl text-amber-300">
                    « {data.formation_titre} »
                  </p>
                </div>
                <div className="pt-4 flex flex-col items-center gap-1 text-xs text-amber-100/60 font-mono">
                  <span>N° {data.certificate_number}</span>
                  <span>
                    Émis le{" "}
                    {new Date(data.issued_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </>
            )}

            {status === "revoked" && data && (
              <>
                <div className="flex items-center gap-2 text-amber-500">
                  <ShieldAlert className="h-6 w-6" />
                  <span className="text-sm tracking-wide uppercase">Certificat révoqué</span>
                </div>
                <p className="text-sm text-amber-100/70 max-w-sm">
                  Ce certificat a été révoqué par Al Baraka Training le{" "}
                  {new Date(data.revoked_at!).toLocaleDateString("fr-FR")}. Il n'est plus valide.
                </p>
                <div className="text-xs font-mono text-amber-100/50">
                  N° {data.certificate_number}
                </div>
              </>
            )}

            {status === "not_found" && (
              <>
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-6 w-6" />
                  <span className="text-sm tracking-wide uppercase">Certificat introuvable</span>
                </div>
                <p className="text-sm text-amber-100/70 max-w-sm">
                  Aucun certificat ne correspond à ce numéro. Vérifiez le numéro ou contactez El
                  Baraka Training.
                </p>
                <div className="text-xs font-mono text-amber-100/50">N° {number}</div>
              </>
            )}

            <div className="pt-6 text-[10px] tracking-widest uppercase text-amber-500/50 font-serif">
              ethicarena.com · Al Baraka Training
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
