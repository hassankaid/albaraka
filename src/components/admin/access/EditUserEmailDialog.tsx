import { useState } from "react";
import { Loader2, Mail, AlertTriangle, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useUpdateUserEmail } from "@/hooks/useAccessAdmin";

interface Props {
  userId: string;
  userName: string;
  currentEmail: string;
  onClose: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditUserEmailDialog({ userId, userName, currentEmail, onClose }: Props) {
  const [newEmail, setNewEmail] = useState("");
  const mutation = useUpdateUserEmail();

  const trimmed = newEmail.trim().toLowerCase();
  const sameAsCurrent = trimmed === currentEmail.trim().toLowerCase();
  const isValid = emailRegex.test(trimmed) && !sameAsCurrent;

  async function handleSubmit() {
    if (!isValid) return;
    try {
      await mutation.mutateAsync({ userId, newEmail: trimmed });
      toast({
        title: "Email modifié",
        description: `${currentEmail} → ${trimmed}`,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Modifier l'email — {userName}
          </DialogTitle>
          <DialogDescription>
            Met à jour l'email dans la base de données ET dans l'authentification Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Email actuel</Label>
            <div className="rounded-md bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground">
              {currentEmail}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="new-email">Nouvel email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nouveau@exemple.com"
              autoFocus
            />
          </div>

          {trimmed && !emailRegex.test(trimmed) && (
            <p className="text-xs text-destructive">Format d'email invalide.</p>
          )}
          {sameAsCurrent && trimmed && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Cet email est identique à l'email actuel.
            </p>
          )}

          {isValid && (
            <div className="rounded-md border p-3 bg-primary/5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Prévisualisation</p>
              <div className="flex items-center gap-2 text-sm font-mono">
                <span className="text-muted-foreground line-through">{currentEmail}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-primary">{trimmed}</span>
              </div>
            </div>
          )}

          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Action irréversible</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                L'utilisateur devra désormais se connecter avec le nouvel email.
                Aucune invitation n'est envoyée automatiquement — tu peux cliquer sur "Envoyer" après enregistrement.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
