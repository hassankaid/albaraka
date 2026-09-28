// ─────────────────────────────────────────────────────────────────────────
// Où le pied de page légal doit apparaître.
//
// Demande de Hassan le 28/09/2026 : pas de pied de page sur la plateforme
// connectée ni sur le domaine d'impersonation. Il encombre un back-office
// où il n'a aucune utilité.
//
// MAIS il ne s'agit PAS de l'enlever par domaine. `plateforme.albarakaecosysteme.com`
// sert aussi les pages publiques : /checkout, /pay/:token, /rdv/*, /quiz/:slug,
// /questionnaire, et les pages légales elles-mêmes. Ce sont exactement celles
// que les publicités désignent et que Meta inspecte — identité de l'annonceur,
// non-affiliation, mention sur les résultats, accès aux cookies. Les en priver
// déferait la mise en conformité du 25/09.
//
// La règle porte donc sur le CHEMIN, pas sur l'hôte : liste blanche explicite
// des pages publiques. Une liste noire des pages internes aurait le mauvais
// mode de défaillance — un tunnel ajouté demain et oublié perdrait son pied de
// page sans que personne ne le voie. Ici, un oubli se voit tout de suite : le
// pied de page manque sur une page qu'on vient de créer.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Chemins publics de l'application. Tout ce qui est en dessous porte le pied
 * de page ; le reste (CRM, espaces membres, admin, parcours) ne l'a pas.
 *
 * Ajouter ici toute nouvelle page accessible sans connexion, ou toute page
 * de paiement, sous peine de la publier sans mentions légales.
 */
export const CHEMINS_PUBLICS = [
  // Pages légales — elles doivent porter le pied de page partout.
  "/mentions-legales",
  "/politique-de-confidentialite",
  "/conditions-generales-de-vente",
  // Paiement.
  "/checkout",
  "/liberty",
  "/acompte",
  "/rebill",
  "/pay",
  "/update-card",
  "/merci",
  // Les remerciements ne sont pas des sous-chemins de /merci : ce sont des
  // chemins distincts, avec un trait d'union. Oubli rattrape par le test.
  "/merci-acompte",
  "/merci-liberty",
  // Tunnels et pages de capture servis aussi par l'application.
  "/webinaire",
  "/vsl",
  "/appel-conference",
  "/al-baraka-200",
  "/temoignages",
  "/video-1",
  "/video-2",
  "/video-3",
  "/rdv",
  "/rdv-rediffusion",
  "/redif",
  "/quiz",
  "/questionnaire",
  "/scoring",
  "/desabonnement",
  // Verification publique d'un certificat : accessible sans connexion.
  "/verify",
] as const;

/**
 * Le pied de page s'affiche-t-il sur ce chemin ?
 *
 * `estHoteInterne` couvre le domaine d'impersonation : c'est un outil interne,
 * jamais montré à un prospect, donc jamais soumis à Meta.
 */
export function afficherPiedDePage(chemin: string, estHoteInterne = false): boolean {
  if (estHoteInterne) return false;
  const c = (chemin || "/").toLowerCase().split("?")[0].split("#")[0];
  return CHEMINS_PUBLICS.some((p) => c === p || c.startsWith(p + "/"));
}
