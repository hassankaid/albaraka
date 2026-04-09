import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProspectProfiles, useProspectProfileWithScripts, type TypeAppel, type ProspectNiveau } from "@/hooks/useRolePlay";

const NIVEAU_CONFIG: Record<ProspectNiveau, { label: string; color: string }> = {
  facile: { label: "⭐ Facile", color: "text-emerald-600 dark:text-emerald-400" },
  moyen: { label: "⭐⭐ Moyen", color: "text-amber-600 dark:text-amber-400" },
  difficile: { label: "⭐⭐⭐ Difficile", color: "text-red-600 dark:text-red-400" },
};

const APPEL_CONFIG: Record<TypeAppel, { label: string; emoji: string }> = {
  ads: { label: "Appel Découverte Ads", emoji: "📞" },
  organique: { label: "Appel Découverte Organique", emoji: "🌱" },
  transformation: { label: "Appel de Transformation / Closing", emoji: "🔥" },
};

export default function RolePlay() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedAppel, setSelectedAppel] = useState<TypeAppel>("ads");
  const [copiedCue, setCopiedCue] = useState<string | null>(null);

  const { data: profiles, isLoading: loadingProfiles } = useProspectProfiles();
  const { data: detail, isLoading: loadingDetail } = useProspectProfileWithScripts(selectedProfileId);

  const handleCopy = async (text: string, cue: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCue(cue);
    toast.success("Réplique copiée !");
    setTimeout(() => setCopiedCue(null), 2000);
  };

  // ─── Vue liste des profils ───
  if (!selectedProfileId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading">🎭 Rôle-Play Prospects</h1>
          <p className="text-muted-foreground">
            Scripts pour jouer le prospect dans chaque situation. Imprime le script et un partenaire joue le prospect pendant que tu t'entraînes comme setter/closer.
          </p>
        </div>

        {loadingProfiles ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profiles?.length ? (
          <p className="text-center text-muted-foreground py-12">Aucun profil disponible.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => {
                  setSelectedProfileId(p.id);
                  setSelectedAppel("ads");
                }}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{p.emoji}</span>
                      <div>
                        <p className="font-semibold text-foreground">{p.label}</p>
                        <p className={cn("text-xs font-medium", NIVEAU_CONFIG[p.niveau].color)}>
                          {NIVEAU_CONFIG[p.niveau].label}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">📞 Ads</Badge>
                    <Badge variant="outline" className="text-xs">🌱 Organique</Badge>
                    <Badge variant="outline" className="text-xs">🔥 Closing</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Vue detail d'un profil ───
  if (loadingDetail || !detail) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { profile, scripts } = detail;
  const currentScript = scripts.find((s) => s.type_appel === selectedAppel);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setSelectedProfileId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{profile.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold font-heading">{profile.label}</h1>
            <p className={cn("text-sm font-medium", NIVEAU_CONFIG[profile.niveau].color)}>
              {NIVEAU_CONFIG[profile.niveau].label}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={selectedAppel} onValueChange={(v) => setSelectedAppel(v as TypeAppel)}>
        <TabsList className="grid grid-cols-3">
          {(Object.keys(APPEL_CONFIG) as TypeAppel[]).map((key) => (
            <TabsTrigger key={key} value={key} className="gap-1.5">
              <span>{APPEL_CONFIG[key].emoji}</span>
              <span className="hidden sm:inline">{APPEL_CONFIG[key].label.replace("Appel ", "").replace(" / Closing", "")}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!currentScript ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aucun script disponible pour ce type d'appel.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Contexte */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
                🎯 Contexte du script
              </p>
              <p className="text-sm text-foreground leading-relaxed">{currentScript.intro}</p>
            </CardContent>
          </Card>

          {/* Répliques */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">
              Répliques du prospect
            </p>
            {currentScript.repliques.map((r, idx) => {
              const cueId = `${currentScript.id}-${idx}`;
              const isCopied = copiedCue === cueId;
              return (
                <Card key={idx} className="overflow-hidden">
                  <div className="px-4 py-2 bg-muted/50 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground">📍 {r.cue}</p>
                  </div>
                  <div className="p-4 flex items-start gap-3">
                    <p className="flex-1 text-sm text-foreground leading-relaxed italic">
                      « {r.reponse} »
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-8"
                      onClick={() => handleCopy(r.reponse, cueId)}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Tips */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                💡 Conseils de jeu
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                Imprime ou affiche ce script. Un partenaire joue le prospect en utilisant ces répliques pendant que tu joues le setter/closer. Adapte les répliques selon le contexte réel de la conversation.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
