// Liens de paiement des élèves : la page « Liens de paiement » et le menu du header
// (Sidali, 13/10/2026) lisent tous les deux le catalogue de l'espace admin
// (table offers) : une offre modifiée, ajoutée ou archivée y apparaît aussitôt.
// Jamais de mode test ici : un lien de test n'encaisse rien.
import { CalendarClock, Crown, GraduationCap, Sparkles, type LucideIcon } from "lucide-react";
import type { Offer, OfferCategory } from "@/hooks/useOffers";
import { getPublicAppOrigin } from "@/lib/impersonation";
import { buildOfferPath } from "@/pages/admin/payment-links/CatalogueTab";

export const META_CATEGORIE: Record<OfferCategory, { label: string; icon: LucideIcon; color: string }> = {
  al_baraka: { label: "AL BARAKA", icon: Crown, color: "text-amber-500" },
  al_baraka_200: { label: "Al Baraka 200 €/mois", icon: CalendarClock, color: "text-amber-500" },
  liberty: { label: "Liberty", icon: Sparkles, color: "text-amber-400" },
  a_la_carte: { label: "À la carte", icon: GraduationCap, color: "text-sky-400" },
};

/**
 * L'ordre d'affichage. Les pass d'abord, les formations à la carte ensuite :
 * ce sont les offres à 3 000 / 2 400 / 5 000 € contre 500 €, et un mur de
 * douze cartes en vrac noyait les trois qui comptent.
 */
// L'offre Al Baraka 200 €/mois n'est pas proposée aux élèves (Hassan, 13/10/2026) :
// elle reste au catalogue pour son propre tunnel, mais sort de leurs liens.
export const ORDRE_CATEGORIES: { categorie: OfferCategory; titre: string; sous_titre: string }[] = [
  { categorie: "al_baraka", titre: "Pass AL BARAKA", sous_titre: "L'écosystème complet" },
  { categorie: "liberty", titre: "Liberty", sous_titre: "L'accompagnement haut de gamme" },
  { categorie: "a_la_carte", titre: "Formations à la carte", sous_titre: "Une compétence à la fois" },
];

export const euros = (n: number) => Number(n).toLocaleString("fr-FR") + " €";

/** Lien public d'une offre en `mensualites` fois, avec une date de démarrage facultative. */
export function lienOffre(offre: Offer, mensualites: number, depart?: string): string {
  const base = `${getPublicAppOrigin()}${buildOfferPath(offre, mensualites)}`;
  return depart ? `${base}?start=${depart}` : base;
}

/** Offres actives, rangées par catégorie dans l'ordre d'affichage. */
export function offresParCategorie(offres: Offer[]) {
  const actives = offres.filter((o) => o.status === "active");
  return ORDRE_CATEGORIES.map((c) => ({ ...c, offres: actives.filter((o) => o.category === c.categorie) })).filter(
    (c) => c.offres.length > 0,
  );
}
