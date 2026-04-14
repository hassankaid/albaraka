import { useEffect } from "react";
import { Eye, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isRunningInImpersonation } from "@/lib/impersonation";
import { supabase } from "@/integrations/supabase/client";

export const IMPERSONATION_BANNER_HEIGHT_PX = 40;

export function ImpersonationBanner() {
  const { profile, user } = useAuth();
  const active = isRunningInImpersonation() && !!user;

  useEffect(() => {
    if (!active) return;
    document.body.classList.add("impersonation-active");
    return () => document.body.classList.remove("impersonation-active");
  }, [active]);

  if (!active) return null;

  const displayName = profile?.full_name || profile?.email || user!.email || "utilisateur";

  const handleExit = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.close();
    }
  };

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] flex h-10 items-center justify-between gap-3 bg-amber-500 px-4 text-sm font-medium text-amber-950 shadow-md"
    >
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          Mode impersonation — connecté en tant que <strong>{displayName}</strong>
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-950/90 px-3 py-1 text-xs font-semibold text-amber-50 transition hover:bg-amber-950"
      >
        <LogOut className="h-3.5 w-3.5" />
        Quitter l'impersonation
      </button>
    </div>
  );
}
