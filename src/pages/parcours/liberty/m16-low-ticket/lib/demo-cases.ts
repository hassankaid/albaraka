/**
 * 10 démos M16 LOW-TICKET (casting canonique, cohérent avec M5/M11/M12/M14).
 * buildDemoState réplique loadDemo() : mappe ctx→m14_data, génère la trame locale, débloque tout.
 */
import { freshState, type M16State, type FormatKey } from "./types";
import { ctx, suggestTitre } from "./validations";
import { generateSections, demoPromesse } from "./generators";

export interface DemoCtx {
  niche: string; avatar: string; mecanisme: string; programme_mt: string;
  prix_mt: number; prix_ht: number; mt_format: string;
  point_a: string; point_b: string; dominant_pain: string; halal: boolean;
}
export interface DemoCase { label: string; format: FormatKey; prix: number; ctx: DemoCtx; }

export const DEMOS: Record<string, DemoCase> = {
  aicha_cocon: { label: "Aïcha — mompreneurs voilées", format: "mini_cours", prix: 27, ctx: {
    niche: "Mères musulmanes voilées 28-40 ans qui veulent lancer une activité depuis chez elles",
    avatar: "Kenza", mecanisme: "Le Cocon", programme_mt: "Le Cocon", prix_mt: 397, prix_ht: 1497, mt_format: "Programme de groupe",
    point_a: "Mère au foyer sans revenu propre", point_b: "Première vente encaissée sur son activité",
    dominant_pain: "Mère au foyer ou en congé parental sans revenu propre, frustrée de ne pas pouvoir contribuer financièrement", halal: true } },
  karim_closer: { label: "Karim — closing halal éthique", format: "ebook", prix: 37, ctx: {
    niche: "Jeunes hommes musulmans 22-35 ans qui veulent générer 4-8k€/mois en remote sans riba",
    avatar: "Ilyas", mecanisme: "Le Closer Halal", programme_mt: "Le Closer Halal", prix_mt: 697, prix_ht: 4497, mt_format: "Formation en ligne",
    point_a: "Sans revenu remote, sans diplôme reconnu", point_b: "Premier contrat closer signé à 8% sur tickets ≥ 3k€",
    dominant_pain: "Diplômé ou en reconversion sans revenu remote, qui ne sait pas par où commencer", halal: true } },
  sofia_reconversion: { label: "Sofia — reconversion cadres burn-out", format: "mini_cours", prix: 47, ctx: {
    niche: "Cadres salariés 35-50 ans en burn-out qui veulent quitter leur job alimentaire",
    avatar: "Yasmina", mecanisme: "Reconversion Mastery", programme_mt: "Reconversion Mastery", prix_mt: 997, prix_ht: 6997, mt_format: "Programme de groupe",
    point_a: "Cadre en burn-out, sans direction claire", point_b: "Premier contrat freelance ≥ 4k€ HT ou poste à ≥ 4 500 € net",
    dominant_pain: "Cadre en burn-out dans un job alimentaire, sans savoir vers quoi se reconvertir et avec peur de tout perdre", halal: false } },
  mehdi_ecom: { label: "Mehdi — e-commerce éthique", format: "ebook", prix: 7, ctx: {
    niche: "Jeunes entrepreneurs 22-32 ans qui veulent monter un e-commerce rentable et durable",
    avatar: "Wassim", mecanisme: "E-com Bootcamp", programme_mt: "E-com Bootcamp", prix_mt: 67, prix_ht: 2997, mt_format: "Membership",
    point_a: "Salarié sans aucune boutique en ligne lancée", point_b: "Boutique rentable à 3k€/mois net stable",
    dominant_pain: "Salarié sans business en ligne qui regarde des reels d'e-commerce sans jamais lancer", halal: false } },
  yacine_devperso: { label: "Yacine — dev perso musulman", format: "mini_cours", prix: 27, ctx: {
    niche: "Hommes musulmans 25-40 ans qui veulent reconnecter à leur deen tout en réussissant professionnellement",
    avatar: "Sofiane", mecanisme: "Niyya & Naissance", programme_mt: "Niyya & Naissance", prix_mt: 247, prix_ht: 1997, mt_format: "Masterclass",
    point_a: "Décalage entre pratique religieuse et vie pro vide", point_b: "Routine spirituelle + mission de vie claire sur 90 jours",
    dominant_pain: "Musulman pratiquant épuisé par le décalage entre sa pratique religieuse et sa vie pro qui semble vide", halal: true } },
  nora_cuisine: { label: "Nora — cuisine famille halal", format: "ebook", prix: 17, ctx: {
    niche: "Mères de famille 30-45 ans qui veulent cuisiner sain pour 4-5 enfants en moins de 30 min/repas",
    avatar: "Rachida", mecanisme: "Sourire à Table", programme_mt: "Sourire à Table", prix_mt: 247, prix_ht: 997, mt_format: "Formation en ligne",
    point_a: "Mère épuisée qui répète les mêmes 5 plats", point_b: "Menus famille équilibrés < 5 €/personne validés par les enfants",
    dominant_pain: "Mère épuisée qui fait du basique tous les jours et culpabilise de ne pas mieux nourrir ses enfants", halal: true } },
  tarik_agence: { label: "Tarik — agence B2B SaaS", format: "mini_cours", prix: 47, ctx: {
    niche: "Fondateurs d'agences B2B SaaS 30-45 ans qui veulent passer de 30k€ à 100k€/mois MRR",
    avatar: "Vincent", mecanisme: "Agency Scale", programme_mt: "Agency Scale", prix_mt: 997, prix_ht: 5997, mt_format: "Programme de groupe",
    point_a: "Agence à 30k€/mois plafonnée", point_b: "Agence à 100k€/mois avec équipe autonome",
    dominant_pain: "Patron d'agence à 30k€/mois plafonné par sa propre charge de travail, sans système réplicable", halal: false } },
  lina_fitness: { label: "Lina — fitness féminin chez soi", format: "ebook", prix: 7, ctx: {
    niche: "Femmes 25-45 ans qui veulent retrouver une forme physique régulière à la maison sans matériel",
    avatar: "Mélanie", mecanisme: "Force Femme", programme_mt: "Force Femme", prix_mt: 39, prix_ht: 1497, mt_format: "Membership",
    point_a: "Démarre un programme et abandonne en 3-4 semaines", point_b: "Routine 4×30min/semaine tenue 90 jours avec progression",
    dominant_pain: "Femme qui démarre un programme tous les 3 mois et abandonne entre la 2e et la 4e semaine", halal: false } },
  adam_immobilier: { label: "Adam — immobilier halal", format: "mini_cours", prix: 27, ctx: {
    niche: "Salariés musulmans 30-45 ans qui veulent devenir propriétaires sans crédit conventionnel avec riba",
    avatar: "Mounir", mecanisme: "Patrimoine Halal", programme_mt: "Patrimoine Halal", prix_mt: 297, prix_ht: 2497, mt_format: "Masterclass",
    point_a: "Salarié locataire sans patrimoine, peur du riba et des montages flous", point_b: "Premier bien acquis par financement halal validé, acte signé",
    dominant_pain: "Salarié locataire qui veut acheter sans riba mais ne sait pas par où commencer et a peur des montages douteux", halal: true } },
  sara_photo: { label: "Sara — photographie newborn", format: "ebook", prix: 27, ctx: {
    niche: "Photographes débutants/intermédiaires 25-45 ans qui veulent se spécialiser sur le newborn premium",
    avatar: "Charlotte", mecanisme: "Newborn Mastery", programme_mt: "Newborn Mastery", prix_mt: 397, prix_ht: 1997, mt_format: "Formation en ligne",
    point_a: "Photographe généraliste qui galère sur les tarifs", point_b: "Studio newborn rentable 6 séances/mois à 600€+",
    dominant_pain: "Photographe généraliste qui galère à se faire payer et alterne baby/mariage/corporate sans vraiment percer", halal: false } },
};

/** Réplique loadDemo() : reset complet, mappe ctx→m14_data, fixe format/titre/promesse/prix/sections, débloque tout. */
export function buildDemoState(id: string): M16State | null {
  const demo = DEMOS[id];
  if (!demo) return null;
  const st = freshState();
  st.demoMode = true;
  st.demoLabel = demo.label;
  st.m14_data = {
    niche: demo.ctx.niche, avatar: demo.ctx.avatar, methode_nom: demo.ctx.mecanisme,
    programme_mt_nom: demo.ctx.programme_mt, prix_mt: demo.ctx.prix_mt, prix_ht: demo.ctx.prix_ht,
    point_a: demo.ctx.point_a, point_b: demo.ctx.point_b, dominant_pain: demo.ctx.dominant_pain,
    format_mt_label: demo.ctx.mt_format, halal_no_riba: demo.ctx.halal,
  };
  st.m14_source = "demo";
  st.data.format_choisi = demo.format;
  st.data.titre = suggestTitre(st);
  st.data.promesse_lt = demoPromesse(ctx(st));
  st.data.prix_lt = demo.prix;
  st.data.sections = generateSections(st);
  st.highest = "lock";
  st.current = "generation";
  return st;
}
