import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CopyButton } from "./CopyButton";
import type { GeneratedProfile } from "../hooks/usePersonalBrand";

interface Props {
  profile: GeneratedProfile;
  index: number;
}

export function ProfileCard({ profile, index }: Props) {
  const lines = Array.isArray(profile.lines) ? profile.lines : [];
  const fullBio = lines.join("\n");
  const fullProfile = `@${profile.username}\n${profile.profileName}\n\n${fullBio}`;

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-heading text-lg text-primary">Profil {index + 1}</span>
            <p className="text-[10px] tracking-wider uppercase text-muted-foreground mt-0.5">
              Style : {profile.style}
            </p>
          </div>
          <CopyButton text={fullProfile} label="Tout copier" />
        </div>

        <Separator />

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-primary/70">Username</span>
              <CopyButton text={profile.username} label="Copier" variant="ghost" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5">@{profile.username}</p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-primary/70">Nom de profil</span>
              <CopyButton text={profile.profileName} label="Copier" variant="ghost" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-0.5">{profile.profileName}</p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-primary/70">Biographie</span>
              <CopyButton text={fullBio} label="Copier la bio" variant="ghost" />
            </div>
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground flex-1">{l}</p>
                <CopyButton text={l} label="" variant="ghost" size="icon" className="h-6 w-6 p-0" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
