import { useState } from "react";
import { Loader2, Send, Rocket, Ticket, GraduationCap, Mail, FlaskConical } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import type { UserAccessRow } from "@/hooks/useAdminTrainingAccess";
import { useSendAccessInvitation } from "@/hooks/useAccessAdmin";

interface Props {
  users: UserAccessRow[]; // 1 ou plusieurs users
  defaultTestMode: boolean;
  onClose: () => void;
}

export function SendInvitationDialog({ users, defaultTestMode, onClose }: Props) {
  const [testMode, setTestMode] = useState(defaultTestMode);
  const sendMutation = useSendAccessInvitation();
  const isBatch = users.length > 1;

  async function handleSend() {
    try {
      const res = await sendMutation.mutateAsync({
        userIds: users.map((u) => u.id),
        testMode,
      });
      const ok = res.sent.length;
      const fail = res.failed.length;
      toast({
        title: `${ok} envoi${ok > 1 ? "s" : ""} OK${fail > 0 ? ` • ${fail} échec${fail > 1 ? "s" : ""}` : ""}`,
        description: fail > 0
          ? res.failed.map((f) => `${f.user_id}: ${f.error}`).join("\n")
          : testMode
            ? "Email(s) envoyé(s) en mode test"
            : "Email(s) envoyé(s) aux destinataires réels",
        variant: fail > 0 ? "destructive" : "default",
      });
      if (fail === 0) onClose();
    } catch (e: any) {
      toast({ title: "Erreur d'envoi", description: e.message, variant: "destructive" });
    }
  }

  const single = !isBatch ? users[0] : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            {isBatch ? `Envoyer l'accès à ${users.length} utilisateurs` : `Envoyer l'accès à ${single?.full_name || single?.email}`}
          </DialogTitle>
          <DialogDescription>
            {isBatch
              ? "Un récapitulatif sera envoyé à chaque destinataire avec un lien d'activation individuel."
              : "Récapitulatif de ce que l'utilisateur aura accès une fois connecté."}
          </DialogDescription>
        </DialogHeader>

        {single && <AccessRecap user={single} />}

        {isBatch && (
          <div className="rounded-md border p-3 space-y-1 text-sm">
            <p className="font-medium">Destinataires :</p>
            <ul className="max-h-32 overflow-y-auto space-y-0.5">
              {users.map((u) => (
                <li key={u.id} className="text-xs text-muted-foreground truncate">
                  {u.full_name || "—"} · {u.email}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
          <FlaskConical className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1 text-sm">
            <div className="font-medium flex items-center gap-2">
              Mode test
              <Badge variant={testMode ? "default" : "outline"} className="text-[10px]">
                {testMode ? "ACTIF" : "OFF"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {testMode
                ? "Envoi vers contact@hassankaid.com avec sujet [TEST → email_réel]"
                : "Envoi vers les vrais destinataires"}
            </p>
          </div>
          <Switch checked={testMode} onCheckedChange={setTestMode} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sendMutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={sendMutation.isPending} className="gap-2">
            {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sendMutation.isPending ? "Envoi…" : `Envoyer${isBatch ? ` (${users.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AccessRecap({ user }: { user: UserAccessRow }) {
  const alBaraka = user.passes.find((p) => p.pass_type === "al_baraka");
  const liberty = user.passes.find((p) => p.pass_type === "liberty");
  const hasFormations = user.manual_enrollments.length > 0;

  return (
    <div className="space-y-2">
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-xs">{user.email}</span>
        </div>
      </div>
      <div className="rounded-md border p-3 space-y-1.5">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Accès inclus</p>
        <AccessLine icon={<Rocket className="h-4 w-4" />} label="Early access" active={user.early_access} />
        <AccessLine icon={<Ticket className="h-4 w-4" />} label="Pass AL BARAKA" active={!!alBaraka} />
        <AccessLine icon={<Ticket className="h-4 w-4" />} label="Pass Liberty" active={!!liberty} />
        <AccessLine
          icon={<GraduationCap className="h-4 w-4" />}
          label={hasFormations
            ? `Formations à la carte (${user.manual_enrollments.length})`
            : "Formations à la carte"}
          active={hasFormations}
        >
          {hasFormations && (
            <ul className="pl-6 mt-1 space-y-0.5 text-xs text-muted-foreground">
              {user.manual_enrollments.map((e) => (
                <li key={e.id}>• {e.formation_title}</li>
              ))}
            </ul>
          )}
        </AccessLine>
      </div>
    </div>
  );
}

function AccessLine({
  icon, label, active, children,
}: { icon: React.ReactNode; label: string; active: boolean; children?: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="flex items-center gap-2">
        <span className={active ? "text-primary" : "text-muted-foreground/60"}>{icon}</span>
        <span className={active ? "text-foreground" : "text-muted-foreground/60"}>
          {label}
        </span>
        {active ? (
          <Badge variant="default" className="ml-auto text-[10px]">Activé</Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-[10px]">Inactif</Badge>
        )}
      </div>
      {children}
    </div>
  );
}
