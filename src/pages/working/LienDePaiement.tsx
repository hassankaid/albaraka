// ─────────────────────────────────────────────────────────────────────────
// Liens de paiement — version ÉLÈVE.
//
// Débloquée par la formation Setting terminée à 100 %, exactement comme le
// rôle Discord « Setting » : même condition, même moment.
//
// Volontairement plus pauvre que /admin/payment-links :
//
//  • pas d'onglet Coupons et tarifs — un coupon est une décision commerciale ;
//  • pas de liens personnalisés — ils écrivent en base, ici on ne fait que
//    construire des URL publiques ;
//  • pas de MODE TEST. C'est le retrait le plus important : un lien de test
//    n'encaisse rien. Un élève qui le copierait enverrait son client sur un
//    paiement fantôme, et personne ne s'en apercevrait avant la relance.
//
// Rien n'est écrit en base ici. Une « création de lien » n'est qu'une URL
// assemblée depuis l'offre et le nombre de mensualités.
//
// LA DOUBLE CONDITION EST INDISPENSABLE : le déblocage dans
// user_feature_unlocks est définitif, alors qu'un pass se révoque. Sans la
// vérification du pass actif ci-dessous, un élève dont on retire le pass
// garderait l'accès à vie.
// ─────────────────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Copy, Check, CalendarClock, Crown, Sparkles, GraduationCap, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useOffers, type Offer, type OfferCategory } from "@/hooks/useOffers";
import { useUserPass } from "@/hooks/useUserPass";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlock";
import { useAuth } from "@/hooks/useAuth";
import { getPublicAppOrigin } from "@/lib/impersonation";
import { buildOfferPath } from "@/pages/admin/payment-links/CatalogueTab";

const META: Record<OfferCategory, { label: string; icon: any; color: string }> = {
  al_baraka:     { label: "AL BARAKA",             icon: Crown,         color: "text-amber-500" },
  al_baraka_200: { label: "Al Baraka 200 €/mois",  icon: CalendarClock, color: "text-amber-500" },
  liberty:       { label: "Liberty",               icon: Sparkles,      color: "text-amber-400" },
  a_la_carte:    { label: "À la carte",            icon: GraduationCap, color: "text-sky-400" },
};

/**
 * L'ordre d'affichage. Les pass d'abord, les formations à la carte ensuite :
 * ce sont les offres à 3 000 / 2 400 / 5 000 € contre 500 €, et un mur de
 * douze cartes en vrac noyait les trois qui comptent.
 */
const ORDRE: { categorie: OfferCategory; titre: string; sous_titre: string }[] = [
  { categorie: "al_baraka",     titre: "Pass AL BARAKA",        sous_titre: "L'écosystème complet" },
  { categorie: "al_baraka_200", titre: "Al Baraka 200 €/mois",  sous_titre: "Le même accès, réglé sur douze mois" },
  { categorie: "liberty",       titre: "Liberty",               sous_titre: "L'accompagnement haut de gamme" },
  { categorie: "a_la_carte",    titre: "Formations à la carte", sous_titre: "Une compétence à la fois" },
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const euros = (n: number) => n.toLocaleString("fr-FR") + " €";

function CarteOffre({ offre }: { offre: Offer }) {
  const { toast } = useToast();
  const maxi = offre.max_installments_count;
  const [mensualites, setMensualites] = useState(maxi > 1 ? maxi : 1);
  const [depart, setDepart] = useState("");
  const [copie, setCopie] = useState(false);


  const url = useMemo(() => {
    const base = `${getPublicAppOrigin()}${buildOfferPath(offre, mensualites)}`;
    // Le seul paramètre autorisé ici. `test=1` n'existe pas sur cette page.
    return depart ? `${base}?start=${depart}` : base;
  }, [offre, mensualites, depart]);

  async function copier() {
    try {
      await navigator.clipboard.writeText(url);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
      toast({ title: "Lien copié" });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  const parMois = mensualites > 1 ? offre.default_price_ht / mensualites : null;

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg text-foreground">{offre.label}</h3>
          </div>
          <div className="text-right shrink-0">
            <div className="font-heading text-xl text-foreground">{euros(offre.default_price_ht)}</div>
            {parMois && (
              <div className="text-xs text-muted-foreground">
                soit {euros(Math.round(parMois))} × {mensualites}
              </div>
            )}
          </div>
        </div>

        {maxi > 1 && (
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-muted-foreground">Nombre de mensualités</div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: maxi }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setMensualites(n)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    n === mensualites
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground">
            Démarrage différé <span className="font-normal">(facultatif)</span>
          </div>
          <Input
            type="date"
            value={depart}
            min={ymd(new Date())}
            onChange={(e) => setDepart(e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground break-all">
          {url}
        </div>

        <Button onClick={copier} className="w-full gap-2" size="sm">
          {copie ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copie ? "Copié" : "Copier le lien"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Verrouille({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card>
        <CardContent className="p-10 flex flex-col items-center text-center gap-5">
          <div className="p-4 rounded-full bg-muted">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="font-heading text-2xl text-foreground">{titre}</h2>
            <p className="text-sm text-muted-foreground max-w-md">{texte}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LienDePaiement() {
  const { profile } = useAuth();
  const { data: offres, isLoading: offresEnCours } = useOffers();
  const { hasAnyPass, isLoading: passEnCours } = useUserPass();
  const { has, isLoading: deblocageEnCours } = useFeatureUnlocks();

  const estStaff = profile?.role === "ceo";

  if (passEnCours || deblocageEnCours || offresEnCours) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Le pass d'abord : c'est la condition qui peut disparaître.
  if (!estStaff && !hasAnyPass) {
    return (
      <Verrouille
        titre="Réservé aux membres"
        texte="Cette page est accessible aux détenteurs d'un Pass AL BARAKA ou Liberty en cours de validité."
      />
    );
  }

  if (!estStaff && !has("payment_links")) {
    return (
      <Verrouille
        titre="Termine la formation Setting"
        texte="Les liens de paiement se débloquent quand la formation Setting est terminée à 100 %, en même temps que ton accès au canal Discord Setting."
      />
    );
  }

  const actives = (offres ?? []).filter((o) => o.status === "active");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="font-heading text-2xl text-foreground">Liens de paiement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choisis une offre et le nombre de mensualités, puis copie le lien à envoyer à ton prospect.
        </p>
      </div>

      {ORDRE.map(({ categorie, titre, sous_titre }) => {
        const offres = actives.filter((o) => o.category === categorie);
        if (offres.length === 0) return null;
        const Icone = META[categorie].icon;
        return (
          <section key={categorie} className="space-y-3">
            <div className="flex items-baseline gap-2 border-b border-border pb-2">
              <Icone className={`h-4 w-4 shrink-0 ${META[categorie].color}`} />
              <h2 className="font-heading text-lg text-foreground">{titre}</h2>
              <span className="text-xs text-muted-foreground">{sous_titre}</span>
              {offres.length > 1 && (
                <span className="ml-auto text-xs text-muted-foreground">{offres.length} formations</span>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {offres.map((o) => (
                <CarteOffre key={o.id} offre={o} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
