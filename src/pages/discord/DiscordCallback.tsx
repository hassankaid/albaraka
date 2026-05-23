import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  useDiscordOAuthExchange,
  getDiscordRedirectUri,
} from "@/hooks/useDiscordLink";

/**
 * Page de retour OAuth Discord.
 *
 * Discord redirige l'élève sur /discord/callback?code=XXX&state=YYY après
 * qu'il ait autorisé. On :
 *   1. Lit code + state depuis l'URL
 *   2. Valide state contre sessionStorage (CSRF)
 *   3. Appelle l'edge function discord-oauth-callback avec le code
 *   4. Affiche success + redirect vers /profile (ou /my-space/profile selon rôle)
 *
 * Cette page est sous ProtectedRoute (user doit être loggé).
 */

type CallbackState =
  | { kind: "processing" }
  | { kind: "success"; username: string; isGuildMember: boolean }
  | { kind: "error"; message: string };

export default function DiscordCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const exchange = useDiscordOAuthExchange();
  const calledRef = useRef(false);

  const [state, setState] = useState<CallbackState>({ kind: "processing" });

  useEffect(() => {
    // Évite le double-call en mode StrictMode (React 18 mount-unmount-mount).
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get("code");
    const urlState = searchParams.get("state");
    const oauthError = searchParams.get("error");
    const oauthErrorDescription = searchParams.get("error_description");

    // ─── Cas 1 : Discord a renvoyé une erreur OAuth ────────────
    if (oauthError) {
      const msg =
        oauthErrorDescription ??
        (oauthError === "access_denied"
          ? "Tu as refusé l'autorisation sur Discord."
          : `Erreur OAuth Discord : ${oauthError}`);
      setState({ kind: "error", message: msg });
      return;
    }

    // ─── Cas 2 : params manquants ──────────────────────────────
    if (!code || !urlState) {
      setState({
        kind: "error",
        message:
          "Paramètres OAuth manquants dans l'URL. Recommence depuis ton profil.",
      });
      return;
    }

    // ─── Cas 3 : Validation CSRF state ─────────────────────────
    const storedState = sessionStorage.getItem("discord_oauth_state");
    if (!storedState || storedState !== urlState) {
      setState({
        kind: "error",
        message:
          "Token de sécurité invalide (CSRF). Recommence la liaison depuis ton profil.",
      });
      return;
    }
    sessionStorage.removeItem("discord_oauth_state");

    // ─── Cas 4 : Exchange code → identity ──────────────────────
    const redirectUri = getDiscordRedirectUri();
    exchange
      .mutateAsync({ code, redirectUri })
      .then((data) => {
        setState({
          kind: "success",
          username: data.discord_global_name || data.discord_username,
          isGuildMember: data.is_guild_member,
        });
        toast({
          title: "✅ Discord lié",
          description: `Connecté en tant que ${data.discord_global_name || data.discord_username}`,
        });
        // Auto-redirect après 3s
        const timer = window.setTimeout(() => {
          navigate("/profile", { replace: true });
        }, 3000);
        return () => window.clearTimeout(timer);
      })
      .catch((e) => {
        setState({
          kind: "error",
          message: (e as Error)?.message ?? "Liaison Discord échouée",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center space-y-4">
          {state.kind === "processing" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-lg font-medium text-foreground">
                Liaison Discord en cours…
              </h2>
              <p className="text-sm text-muted-foreground">
                On finalise la connexion avec ton compte Discord.
              </p>
            </>
          )}

          {state.kind === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-medium text-foreground">
                Discord lié 🎉
              </h2>
              <p className="text-sm text-muted-foreground">
                Connecté en tant que <span className="font-mono text-foreground">{state.username}</span>
              </p>
              {!state.isGuildMember && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-3 text-xs text-left">
                  <p className="text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                    Tu n'es pas (encore) membre du serveur AL BARAKA Discord.
                    Pense à le rejoindre pour recevoir les rôles des formations.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Redirection vers ton profil dans 3 secondes…
              </p>
              <Button
                onClick={() => navigate("/profile", { replace: true })}
                variant="outline"
                size="sm"
              >
                Y aller maintenant
              </Button>
            </>
          )}

          {state.kind === "error" && (
            <>
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-lg font-medium text-foreground">
                Liaison échouée
              </h2>
              <p className="text-sm text-muted-foreground">{state.message}</p>
              <div className="flex gap-2 justify-center pt-2">
                <Button
                  onClick={() => navigate("/profile", { replace: true })}
                  variant="outline"
                  size="sm"
                >
                  Retour au profil
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
