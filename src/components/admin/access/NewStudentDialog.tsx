import { useState } from "react";
import { UserPlus, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewStudentDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFirstName("");
    setLastName("");
    setEmail("");
    setSubmitting(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      toast({ title: "Prénom et nom requis", variant: "destructive" });
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast({ title: "Email invalide", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        user_id?: string;
        email?: string;
        error?: string;
      }>("admin-create-student", {
        body: {
          first_name: trimmedFirst,
          last_name: trimmedLast,
          email: trimmedEmail,
        },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Erreur inconnue");
      }

      toast({
        title: "Élève invité",
        description: `Email envoyé à ${trimmedEmail}. Le pass Al Baraka est actif, l'élève suivra le parcours complet (Discord → onboarding RIB → parcours).`,
      });

      await queryClient.invalidateQueries({ queryKey: ["admin-training-access"] });
      reset();
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nouvel élève
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un nouvel élève</DialogTitle>
          <DialogDescription>
            L'élève recevra le même email d'accès qu'un paiement par bon de commande,
            avec le PASS AL BARAKA déjà attribué. Il passera ensuite par Discord → onboarding RIB → parcours.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-student-first-name">Prénom</Label>
              <Input
                id="new-student-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Mohamed"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-student-last-name">Nom</Label>
              <Input
                id="new-student-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Benali"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-student-email">Email</Label>
            <Input
              id="new-student-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mohamed.benali@example.com"
              disabled={submitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Créer et envoyer l'email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
