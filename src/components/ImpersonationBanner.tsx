import { Eye, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isRunningInImpersonation } from "@/lib/impersonation";
import { supabase } from "@/integrations/supabase/client";

export function ImpersonationBanner() {
  const { profile, user } = useAuth();

  if (!isRunningInImpersonation()) return null;
  if (!user) return null;

  const displayName = profile?.full_name || profile?.email || user.email || "utilisateur";

  const handleExit = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.close();
    }
  };

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950 shadow-md">
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
