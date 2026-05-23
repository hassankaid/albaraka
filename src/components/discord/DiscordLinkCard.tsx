import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Link2, Unlink, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  useDiscordLink,
  useUnlinkDiscord,
  buildDiscordOAuthUrl,
  getDiscordRedirectUri,
  getDiscordAvatarUrl,
} from "@/hooks/useDiscordLink";

/**
 * Card de liaison Discord, intégrable dans /profile et /my-space/profile.
 *
 * États :
 *   - Loading : skeleton
 *   - Non lié : bouton « Lier mon compte Discord » → redirect OAuth
 *   - Lié + membre du serveur : avatar + handle + badge ✓ + bouton délier
 *   - Lié mais pas membre : avatar + handle + warning + lien d'invitation
 */

// Icône Discord officielle (SVG inline pour éviter une dépendance)
function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02C2.0 9.46 1.31 13.5 1.65 17.5c0 .02.01.04.03.05a19.95 19.95 0 0 0 5.99 3.03c.03.01.06 0 .08-.02.46-.63.87-1.29 1.22-1.99.02-.04 0-.08-.04-.09a13.06 13.06 0 0 1-1.86-.89c-.04-.02-.04-.08-.01-.11.12-.09.25-.19.37-.29.02-.02.05-.02.07-.01 3.9 1.78 8.13 1.78 11.99 0 .02-.01.05 0 .07.01.12.1.24.2.37.29.04.03.04.09-.01.11a12.06 12.06 0 0 1-1.86.89c-.04.01-.05.06-.04.09.36.7.77 1.36 1.22 1.99.03.02.06.03.09.02 1.96-.61 3.95-1.52 5.99-3.03.02-.01.03-.03.03-.05.36-4.62-.6-8.62-2.69-12.15-.01-.01-.02-.02-.04-.02zM8.52 15.09c-1.18 0-2.16-1.08-2.16-2.41 0-1.33.95-2.41 2.16-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.96 2.41-2.16 2.41zm7.97 0c-1.18 0-2.16-1.08-2.16-2.41 0-1.33.95-2.41 2.16-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41z" />
    </svg>
  );
}

const DISCORD_BRAND_COLOR = "#5865F2";

interface DiscordLinkCardProps {
  /** Lien d'invitation au serveur si l'élève n'est pas (encore) membre. Optionnel. */
  inviteUrl?: string;
}

export default function DiscordLinkCard({ inviteUrl }: DiscordLinkCardProps) {
  const linkQuery = useDiscordLink();
  const unlink = useUnlinkDiscord();

  const link = linkQuery.data;

  const handleConnect = () => {
    // Génère un state CSRF aléatoire, stocke en sessionStorage
    const state = crypto.randomUUID();
    sessionStorage.setItem("discord_oauth_state", state);

    // Construit l'URL OAuth et redirige
    const redirectUri = getDiscordRedirectUri();
    const oauthUrl = buildDiscordOAuthUrl(state, redirectUri);
    window.location.href = oauthUrl;
  };

  const handleUnlink = async () => {
    if (
      !window.confirm(
        "Es-tu sûr de vouloir délier ton compte Discord ? Tu perdras l'accès aux canaux des formations terminées (réversible en relier ton compte).",
      )
    ) {
      return;
    }
    try {
      await unlink.mutateAsync();
      toast({
        title: "Discord délié",
        description: "Ton compte Discord a été délié de la plateforme.",
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: (e as Error)?.message ?? "Erreur inconnue",
        variant: "destructive",
      });
    }
  };

  const avatarUrl = useMemo(
    () =>
      link
        ? getDiscordAvatarUrl(link.discord_user_id, link.discord_avatar)
        : null,
    [link],
  );

  const displayName = link?.discord_global_name || link?.discord_username || "";
  const handle = link?.discord_username ?? "";

  // ─── Loading ───────────────────────────────────────────────────
  if (linkQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_BRAND_COLOR }} />
            Discord
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // ─── Non lié ───────────────────────────────────────────────────
  if (!link) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_BRAND_COLOR }} />
            Discord
          </CardTitle>
          <CardDescription className="text-xs">
            Connecte ton compte Discord pour débloquer automatiquement les canaux
            des formations que tu termines (Marketing, Setting, Closing).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnect}
            className="gap-2 text-white"
            style={{ backgroundColor: DISCORD_BRAND_COLOR }}
          >
            <DiscordIcon className="h-4 w-4" />
            Lier mon compte Discord
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Lié ───────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DiscordIcon className="h-5 w-5" style={{ color: DISCORD_BRAND_COLOR }} />
          Discord
          {link.is_guild_member ? (
            <Badge className="bg-emerald-500/15 text-emerald-500 border-0 gap-1 text-[10px] ml-1">
              <CheckCircle2 className="h-3 w-3" />
              Connecté
            </Badge>
          ) : (
            <Badge className="bg-amber-500/15 text-amber-500 border-0 gap-1 text-[10px] ml-1">
              <AlertTriangle className="h-3 w-3" />
              Pas sur le serveur
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} />
            )}
            <AvatarFallback
              className="text-sm"
              style={{ backgroundColor: DISCORD_BRAND_COLOR, color: "white" }}
            >
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{handle}
            </p>
          </div>
        </div>

        {!link.is_guild_member && (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] p-3 text-xs space-y-2">
            <p className="text-amber-700 dark:text-amber-400">
              <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
              Ton compte Discord n'est pas (encore) membre du serveur AL BARAKA.
              Tu dois rejoindre le serveur pour recevoir les rôles des formations.
            </p>
            {inviteUrl && (
              <Button asChild size="sm" variant="outline" className="w-full">
                <a href={inviteUrl} target="_blank" rel="noreferrer">
                  Rejoindre le serveur Discord
                </a>
              </Button>
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleUnlink}
          disabled={unlink.isPending}
          className="gap-2"
        >
          {unlink.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5" />
          )}
          Délier Discord
        </Button>
      </CardContent>
    </Card>
  );
}
