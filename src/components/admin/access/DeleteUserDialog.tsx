import { useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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

interface DeleteUserDialogProps {
  userId: string | null;
  userName: string;
  userEmail: string;
  userRole: string;
  onClose: () => void;
}

export function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  userRole,
  onClose,
}: DeleteUserDialogProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        error?: string;
      }>("admin-delete-user", { body: { user_id: userId } });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erreur inconnue");
      }

      toast({
        title: "Utilisateur supprimé",
        description: `${userName} (${userEmail}) a été supprimé et ses liens métier ont été nettoyés.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-training-access"] });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Suppression échouée", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={!!userId} onOpenChange={(v) => !v && !submitting && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2 text-sm">
            <p>
              Vous êtes sur le point de supprimer{" "}
              <strong className="text-foreground">{userName}</strong>{" "}
              <span className="text-muted-foreground">({userEmail})</span>{" "}
              <span className="inline-block px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">
                {userRole}
              </span>
              .
            </p>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1.5">
              <p className="font-semibold text-destructive">Ce qui sera supprimé :</p>
              <ul className="list-disc list-inside space-y-0.5 text-destructive/90">
                <li>Compte auth + profile (connexion impossible)</li>
                <li>Tous ses pass formation + accès parcours</li>
                <li>Ses activités, notifications, agent conversations</li>
                <li>Historique de coaching (sessions, présences)</li>
                <li>Sessions et contenus personnels</li>
              </ul>
              <p className="font-semibold text-destructive pt-1.5">Ce qui est conservé :</p>
              <ul className="list-disc list-inside space-y-0.5 text-foreground/80">
                <li>Les leads qu'il gérait (désaffectés, reviennent dans le pool)</li>
                <li>Les ventes, commissions et paiements (historique comptable)</li>
                <li>Les appels tenus (désaffectés)</li>
              </ul>
            </div>
            <p className="text-destructive font-medium">
              Cette action est irréversible.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={submitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Suppression…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
