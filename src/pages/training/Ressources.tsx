// Espace Training « Ressources » (Sidali, 13/10/2026) : remplace « Scripts ».
// Une section déroulante par phase avec toutes ses ressources téléchargeables ;
// Setting et Closing séparent les scripts internes AL BARAKA des templates.
// L'élève ne voit que les phases des parcours auxquels il est inscrit (RLS).
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderDown, Loader2, MonitorPlay, PenLine, Wand2, type LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { RessourceEleve } from "@/components/training/RessourceEleve";
import {
  rangerRessources,
  SLUGS_FORMATIONS_RESSOURCES,
  type FormationSource,
  type PhaseRessources,
  type RessourceRangee,
} from "@/lib/ressourcesPhases";

interface Raccourci {
  titre: string;
  description: string;
  to: string;
  icone: LucideIcon;
}

// Ce qui n'est pas un fichier mais a sa place dans les scripts de la phase.
const RACCOURCIS: Record<string, { internes?: Raccourci[]; templates?: Raccourci[] }> = {
  setting: {
    internes: [
      {
        titre: "Script DM et objections setting — version en ligne",
        description: "Le script DM AL BARAKA et les réponses aux objections, à copier en un clic.",
        to: "/training/scripts-en-ligne?onglet=setting",
        icone: MonitorPlay,
      },
    ],
  },
  closing: {
    internes: [
      {
        titre: "Scripts closing et objections — version en ligne",
        description: "Les scripts d'appel de vente AL BARAKA et les réponses aux objections.",
        to: "/training/scripts-en-ligne?onglet=closing",
        icone: MonitorPlay,
      },
    ],
    templates: [
      {
        titre: "Construire mon script d'appel",
        description: "Remplis les modèles d'appel découverte et d'appel de transformation, puis télécharge-les en Word ou PDF.",
        to: "/training/script-appel",
        icone: PenLine,
      },
      {
        titre: "Script Forge",
        description: "Génère un script d'appel découverte ou closing sur mesure pour ton offre.",
        to: "/training/script-forge",
        icone: Wand2,
      },
    ],
  },
};

function useRessourcesParPhase() {
  return useQuery({
    queryKey: ["ressources-par-phase"],
    queryFn: async () => {
      // rubrique (13/10/2026) n'est pas encore dans les types générés.
      const { data, error } = await (supabase.from("formations") as any)
        .select(
          `id, slug,
           formation_modules(id, titre, ordre, status,
             formation_chapitres(id, titre, ordre, status,
               chapitre_ressources(id, titre, type, url, ordre, rubrique)))`,
        )
        .in("slug", SLUGS_FORMATIONS_RESSOURCES)
        .eq("status", "published");
      if (error) throw error;
      // La politique « formations publiées visibles de tous » renvoie aussi les
      // parcours de l'élève non inscrit, mais sans modules (RLS) : rien à ranger.
      return rangerRessources((data ?? []) as FormationSource[]);
    },
  });
}

function ListeRessources({ ressources }: { ressources: RessourceRangee[] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {ressources.map((r) => (
        <div key={r.id} className="space-y-1">
          <RessourceEleve ressource={r} />
          <p className="line-clamp-1 px-1 text-[11px] text-muted-foreground">{r.chapitreTitre}</p>
        </div>
      ))}
    </div>
  );
}

function CarteRaccourci({ r }: { r: Raccourci }) {
  const Icone = r.icone;
  return (
    <Link
      to={r.to}
      className="group flex items-start gap-3 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent p-3 transition-colors hover:border-amber-500/70"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-600">
        <Icone className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{r.titre}</span>
        <span className="block text-xs text-muted-foreground">{r.description}</span>
      </span>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-amber-600 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SousSection({
  titre,
  ressources,
  raccourcis = [],
}: {
  titre: string;
  ressources: RessourceRangee[];
  raccourcis?: Raccourci[];
}) {
  if (ressources.length === 0 && raccourcis.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titre}</h4>
      {raccourcis.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {raccourcis.map((r) => (
            <CarteRaccourci key={r.to} r={r} />
          ))}
        </div>
      )}
      {ressources.length > 0 && <ListeRessources ressources={ressources} />}
    </div>
  );
}

function ContenuPhase({ p }: { p: PhaseRessources }) {
  if (!p.phase.scriptsSepares) return <ListeRessources ressources={p.autres} />;
  const raccourcis = RACCOURCIS[p.phase.cle] ?? {};
  return (
    <div className="space-y-5">
      <SousSection titre="Scripts internes AL BARAKA" ressources={p.scriptsInternes} raccourcis={raccourcis.internes} />
      <SousSection titre="Scripts templates (modèles de script)" ressources={p.scriptsTemplates} raccourcis={raccourcis.templates} />
      <SousSection titre="Autres ressources" ressources={p.autres} />
    </div>
  );
}

export default function Ressources() {
  const { data: phases, isLoading, error } = useRessourcesParPhase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Ressources</h1>
        <p className="text-muted-foreground">
          Toutes les ressources à télécharger de tes parcours, rangées par phase.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-12 text-center text-muted-foreground">Les ressources n'ont pas pu être chargées. Réessaie dans un instant.</p>
      ) : !phases?.length ? (
        <div className="flex flex-col items-center py-12 text-center text-muted-foreground">
          <FolderDown className="mb-3 h-8 w-8" />
          <p>Aucune ressource pour l'instant : elles apparaissent ici avec tes parcours.</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {phases.map((p) => (
            <AccordionItem key={p.phase.cle} value={p.phase.cle} className="rounded-xl border bg-card px-4" data-testid={`phase-${p.phase.cle}`}>
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-3">
                  <span className="text-base font-semibold">{p.phase.titre}</span>
                  <Badge variant="secondary">
                    {p.total} ressource{p.total > 1 ? "s" : ""}
                  </Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <ContenuPhase p={p} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
