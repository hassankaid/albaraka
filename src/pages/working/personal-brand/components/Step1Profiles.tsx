import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { ProfileCard } from "./ProfileCard";
import type { GeneratedProfile } from "../hooks/usePersonalBrand";

interface Props {
  profiles: GeneratedProfile[];
  confirmedAt: string | null;
  onRegenerate: () => void;
  onConfirm: () => void;
  regenerating: boolean;
  confirming: boolean;
}

export default function Step1Profiles({
  profiles,
  confirmedAt,
  onRegenerate,
  onConfirm,
  regenerating,
  confirming,
}: Props) {
  const [checked, setChecked] = useState(!!confirmedAt);
  const isConfirmed = !!confirmedAt;

  return (
    <Card id="step-1" className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="p-6 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <h2 className="font-heading text-xl text-foreground">Tes 10 profils Instagram</h2>
            {isConfirmed && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Validé
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Choisis-en un, ou fais ton mix entre plusieurs. Tu peux régénérer
            si aucun ne te plaît.
          </p>
        </div>

        <div id="profiles" className="space-y-3">
          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun profil généré pour l'instant.
            </p>
          )}
          {profiles.map((p, i) => (
            <ProfileCard key={i} profile={p} index={i} />
          ))}
        </div>

        {!isConfirmed && profiles.length > 0 && (
          <>
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerate}
                disabled={regenerating || confirming}
                className="gap-2 text-xs"
              >
                {regenerating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Régénérer 10 nouveaux profils
              </Button>
            </div>

            <div className="rounded-lg border border-primary/30 bg-primary/[0.05] p-4 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => setChecked(v === true)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  J'ai configuré mon profil Instagram (et/ou TikTok) avec l'un de
                  ces 10 profils — ou un mix qui me ressemble.
                </span>
              </label>
              <Button
                onClick={onConfirm}
                disabled={!checked || confirming}
                className="w-full gap-2"
              >
                {confirming && <Loader2 className="h-4 w-4 animate-spin" />}
                Valider et débloquer l'étape 2
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
