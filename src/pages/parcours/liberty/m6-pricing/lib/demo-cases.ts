/**
 * Mode démo M6 — 10 cas pré-remplis (verbatim Sidali v1.2.0).
 * Tous des bons cas — pas d'anti-pattern en M6 (commentaire Sidali : « les démos ne servent pas d'anti-pattern »).
 * Casting synchronisé M1-M5 : Karim, Imen, Khadija, Aïcha&Tarek, Najet, Salima, Mehdi, Mounia&Anas, Younes, Lina.
 */

import type { M6State, M6Data } from "./types";

export interface M6DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  ready: boolean;
  patch?: Partial<M6State>;
}

// ── Helpers ──────────────────────────────────────────────────────────
function buildBase(opts: {
  avatar: string; niche: string; m2_pain: string;
  m3_promesse: string; m3_mecanisme: string; m3_prix: string;
  m4_strategy: M6State["m4_data"]["entry_strategy"]; m4_ht_target: number;
}): Partial<M6State> {
  return {
    current: "valeur_prix",
    m1_data: { source: "demo", sous_niche_2: { phrase: opts.niche, phrase_finale: opts.niche }, avatar: { socio: { nom: opts.avatar } }, marche: { id: "argent", label: "💰" } },
    m1_source: "profile",
    m2_data: { source: "demo", data: { dominant_pain: opts.m2_pain } },
    m2_source: "profile",
    m3_data: { source: "demo", complete: true, promesse: opts.m3_promesse, headline_promesse: opts.m3_promesse, hero_mecanisme_nom: opts.m3_mecanisme, prix_display: opts.m3_prix, prix_score_global: 82 },
    m3_source: "profile",
    m4_data: { source: "demo", complete: true, entry_strategy: opts.m4_strategy, ht_monthly_target: opts.m4_ht_target, strategy_score_is_forced: false, ht: { name: opts.m3_mecanisme, price: opts.m3_prix, format: "12 sem", rationale: "" } },
    m4_source: "profile",
    m5_data: { source: "demo", complete: true, handoff_to_m6: { handoff_version: "m5_v1.1.0", avg_score: 88, upstream_forced: false } },
    m5_source: "profile",
    upstream_forced: false,
  };
}

const FULL_SCORES = { valeur_prix: 88, prix_valeur: 90, prix_marche: 86, prix_confiance: 84, paiements: 90, bao: 88, script_annonce: 92 };
const FULL_ATTEMPTS = { valeur_prix: 1, prix_valeur: 1, prix_marche: 1, prix_confiance: 1, paiements: 1, bao: 1, script_annonce: 1 };
const NO_FORCED = { valeur_prix: false, prix_valeur: false, prix_marche: false, prix_confiance: false, paiements: false, bao: false, script_annonce: false };

const COMMIT_DEFAULT = { signed: false, signed_at: null, leviers_valeur: ["Ajouter 2 calls 1to1 supplémentaires de coaching individuel", "Offrir l'accès lifetime à la bibliothèque de templates", "Inclure une session annuelle de bilan stratégique post-programme"] as [string, string, string] };

// ── 1 · Karim · Affiliation halal (ROI 6x) ───────────────────────────
const KARIM_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Mon programme permet à un débutant de générer 18 000 € de commissions affiliation halal en 12 mois avec 1h/jour. Au prix de 2 997 €, c'est 6× son investissement la première année — et ensuite le système tourne tout seul.", signal_phrase: "Mon prix dit que je travaille avec ceux qui veulent vraiment construire un revenu halal sérieux — pas les curieux.", ancrage_phrase: "Blueprint + scripts DM + communauté Telegram + 2 lives Q&A/mois + accès setters. Valeur totale 8 400 €. Aujourd'hui 2 997 €.", contraste_phrase: "12 mois à ne rien faire = au moins 18 000 € de commissions perdues. Le programme coûte 1/6 de ça.", non_excuse_phrase: "Le programme est à 2 997 €. C'est l'investissement, et il est verrouillé." },
  prix_valeur: { resultat_client_12m: "18000", prix_ht: "2997", roi_calcule: 6, justification_chiffrage: "Le client signe en moyenne 3 deals affiliation par mois à 500 € de commission = 1 500 €/mois × 12 mois = 18 000 €/an. Mécanique vérifiée sur les 10 premiers élèves de la cohorte beta." },
  prix_marche: { concurrents: [{ nom: "AffiliPro · programme classique", prix: "2400", url: "concurrent1.com" }, { nom: "AffiliateHub · pack premium", prix: "2700", url: "concurrent2.com" }, { nom: "CoachAff · formation 12 semaines", prix: "2300", url: "concurrent3.com" }], prix_marche_moyen: 2467, positionnement: "Parité premium · 2 997€ vs moyenne 2 467€ (+22%) — accès direct aux setters/closers AL BARAKA justifie l'écart." },
  prix_confiance: { confiance_sur_deliver: 85, prix_temporaire: "", doutes_principaux: "Je doute que les débutants tiennent les 4 calls/mois sur 12 mois. Je crains que le ratio coach/élèves ne tienne pas si je passe 30 élèves simultanés.", action_renforcement: "Cette semaine : appeler les 5 premiers élèves clos pour valider qu'ils signent bien 3 deals/mois en S+90.", plan_augmentation: { prochain_palier_prix: 3497, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 999€/mois, sans riba. Tu démarres ton premier deal pendant que tu paies le programme — ROI immédiat." },
  bao: { bronze: { prix: "1497", contenu_court: "Blueprint + scripts DM + accès Telegram." }, argent: { prix: "2997", contenu_court: "Tout + 2 lives Q&A/mois + accès setters AL BARAKA." }, or: { prix: "5497", contenu_court: "Tout + 4 calls 1to1 + placement chez 1 coach partenaire AL BARAKA." } },
  script_annonce: { script_text: "Mon programme génère 18 000€ de commissions affiliation halal sur 12 mois — un coach individuel à 200€/h sur 30 heures c'est 6 000€. Blueprint + scripts DM + Telegram + 2 lives Q&A + accès setters, valeur 8 400€. Aujourd'hui 2 997€. Mon prix dit que je travaille avec ceux qui veulent vraiment construire un revenu halal sérieux — pas les curieux. Combien tu perds chaque mois à attendre ? Sur 12 mois c'est 18 000€ de commissions perdues. Tu peux régler en 3 fois sans frais à 999€/mois, sans riba, et tu démarres ton premier deal pendant que tu paies le programme — ROI immédiat. Le programme est à 2 997€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const KARIM_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Karim", niche: "Salariés musulmans 25-40 ans qui veulent générer 1 500-5 000€/mois en affiliation halal en 90 jours", m2_pain: "Frustration de bosser 35h/semaine pour un salaire qui ne lui permet ni d'épargner sérieusement, ni d'aider sa mère", m3_promesse: "Faire 1 000€ de commission sur ton premier cycle de 60 jours en affiliation halal, sans toucher au riba", m3_mecanisme: "Méthode Tawakkul Affiliate™", m3_prix: "2 997€", m4_strategy: "ht_lt", m4_ht_target: 8 }),
  data: KARIM_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 2 · Imen · SMMA modest fashion ───────────────────────────────────
const IMEN_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Mon programme permet à une étudiante musulmane de lancer sa SMMA modest fashion et signer son premier client 800€/mois en 60 jours. Investissement 1 997€ remboursé dès le 3ème mois client.", signal_phrase: "Mon prix signale que je forme des étudiantes qui veulent vraiment lancer une SMMA, pas qui collectionnent les cours.", ancrage_phrase: "Blueprint + outreach + Discord + 4 calls de groupe/mois + audit funnel. Valeur 7 500€. Aujourd'hui 1 997€.", contraste_phrase: "Une étudiante qui hésite 12 mois perd ses meilleurs mois de motivation et 10 000€ de CA potentiel.", non_excuse_phrase: "Le programme est à 1 997€. C'est le prix d'entrée du blueprint." },
  prix_valeur: { resultat_client_12m: "18000", prix_ht: "1997", roi_calcule: 9, justification_chiffrage: "1er client SMMA signé en 60j à 800€/mois récurrent + 1 second client M3-M4 à 700€/mois = 1 500€/mois × 12 = 18 000€/an. Mécanique vérifiée sur 7 étudiantes cohorte beta." },
  prix_marche: { concurrents: [{ nom: "SMMAFastTrack · pack étudiants", prix: "1200", url: "concurrent-smma1.com" }, { nom: "AgenceMastery · blueprint", prix: "1400", url: "concurrent-smma2.com" }, { nom: "ScalingMarketing · starter", prix: "1500", url: "concurrent-smma3.com" }], prix_marche_moyen: 1367, positionnement: "Premium · 1 997€ vs moyenne 1 367€ (+46%) — Loom audit pré-enregistré + accompagnement pair à pair justifient." },
  prix_confiance: { confiance_sur_deliver: 75, prix_temporaire: "", doutes_principaux: "Je doute que les étudiantes tiennent l'engagement de 4 calls/mois avec leurs cours. Je crains que mes 2 mois ramp-up annoncés soient trop optimistes pour les profils débutants.", action_renforcement: "Cette semaine : je rédige un guide « réussir ses 90 premiers jours » et je le diffuse aux 4 cas tests pour validation.", plan_augmentation: { prochain_palier_prix: 2300, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 666€/mois, sans riba. Tu signes tes premiers clients SMMA pendant que tu paies le programme — ROI immédiat." },
  bao: { bronze: { prix: "997", contenu_court: "Blueprint SMMA modest fashion + templates outreach." }, argent: { prix: "1997", contenu_court: "Tout + groupe Discord + 4 calls de groupe/mois." }, or: { prix: "3497", contenu_court: "Tout + coaching 1to1 hebdo + revue propales + intro marques." } },
  script_annonce: { script_text: "Mon programme permet à une étudiante de signer son premier client SMMA en 60 jours — revenu mensuel 1 500€ dès le 3ème mois, soit 18 000€/an. Blueprint + scripts outreach + Discord + 4 calls de groupe/mois, valeur 7 500€. Aujourd'hui 1 997€. Mon prix signale que je forme des étudiantes qui veulent vraiment lancer une SMMA, pas qui collectionnent les cours. Une étudiante qui hésite 12 mois perd ses meilleurs mois de motivation et 10 000€ de CA potentiel. Tu peux régler en 3 fois sans frais à 666€/mois, sans riba, et tu signes tes premiers clients SMMA pendant que tu paies le programme — ROI immédiat. Le programme est à 1 997€. C'est le prix d'entrée du blueprint." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const IMEN_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Imen", niche: "Étudiantes musulmanes 20-25 ans qui veulent monter une SMMA modest fashion en 90 jours", m2_pain: "Devoir choisir entre stages mal payés et abandon des études", m3_promesse: "Signer ton 1er client SMMA à 800€/mois en 45 jours dans la modest fashion", m3_mecanisme: "Modest SMMA Blueprint", m3_prix: "1 997€", m4_strategy: "ht_lt", m4_ht_target: 6 }),
  data: IMEN_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 8 · Mounia & Anas · Immo halal (ROI 5x) ──────────────────────────
const MOUNIA_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Méthode Mourabaha + 6 calls de groupe + accompagnement notaire. Permet à un couple d'acquérir leur 1er bien halal sans riba en 18 mois. Cash flow + appréciation patrimoniale annualisée = 25 000€/an de valeur réelle dès la 1ère acquisition.", signal_phrase: "Mon prix signale un accompagnement patrimonial halal premium — pour des couples qui investissent leur avenir, pas qui hésitent.", ancrage_phrase: "Méthode + calls + accompagnement notaire + revue 2 dossiers + intro réseau bancaire halal. Valeur totale 12 000€. Aujourd'hui 4 997€.", contraste_phrase: "Un an de plus à attendre = un cycle d'inflation perdu, 25 000€ de patrimoine non construit.", non_excuse_phrase: "Le programme est à 4 997€. C'est le prix d'entrée du patrimoine halal." },
  prix_valeur: { resultat_client_12m: "25000", prix_ht: "4997", roi_calcule: 5, justification_chiffrage: "Sur l'acquisition d'un 1er bien à 250 000€ en mourabaha : cash flow locatif net 6 000€/an + appréciation patrimoniale moyenne France 4%/an × 250 000 = 10 000€ + économie vs financement classique avec riba 9 000€/an. Total 25 000€/an dès l'acquisition." },
  prix_marche: { concurrents: [{ nom: "MourabahaFormation · pack", prix: "3800", url: "concurrent-immo1.com" }, { nom: "PatrimoineHalal · 6 mois", prix: "4200", url: "concurrent-immo2.com" }, { nom: "InvestSansRiba · accompagnement", prix: "4000", url: "concurrent-immo3.com" }], prix_marche_moyen: 4000, positionnement: "Premium · 4 997€ vs moyenne 4 000€ (+25%) — accompagnement notaire + intro banques islamiques justifient." },
  prix_confiance: { confiance_sur_deliver: 82, prix_temporaire: "", doutes_principaux: "Je doute que mon réseau bancaire halal couvre toutes les régions de France. Je crains que la lenteur des notaires casse l'élan motivation des couples.", action_renforcement: "Cette semaine : contacter 3 notaires régionaux pour élargir le réseau et créer un module « gérer les délais notaires ».", plan_augmentation: { prochain_palier_prix: 5750, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": true, "12x": true }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 12 fois sans frais à 416€/mois, sans riba. Le couple démarre la méthode Mourabaha dès maintenant et finance sur 12 mois — sans avancer 5K€ d'un coup." },
  bao: { bronze: { prix: "2497", contenu_court: "Méthode Mourabaha + templates offres + checklist juridique." }, argent: { prix: "4997", contenu_court: "Tout + 6 calls de groupe + accompagnement notaire + revue 2 dossiers." }, or: { prix: "8997", contenu_court: "Tout + acquisition accompagnée 1to1 + intro réseau bancaire halal." } },
  script_annonce: { script_text: "Mon accompagnement permet aux couples d'acquérir leur premier bien halal en moins de 12 mois — une consultation patrimoniale à 150€/h sur 30 heures c'est 4 500€. Programme complet + 6 calls de groupe + accompagnement notaire + revue dossiers, valeur 12 000€. Aujourd'hui 4 997€. Mon prix signale un accompagnement patrimonial halal premium, pour des couples qui investissent leur avenir, pas qui hésitent. Combien tu perds chaque mois en loyer perdu sans acquérir ? Sur 12 mois c'est 12 000 à 18 000€. Tu peux régler en 12 fois sans frais à 416€/mois, sans riba, et le couple démarre la méthode Mourabaha dès maintenant et finance sur 12 mois sans avancer 5K€ d'un coup. Le programme est à 4 997€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const MOUNIA_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Mounia & Anas", niche: "Couples musulmans 28-40 ans qui veulent acquérir leur 1er bien locatif sans riba en 12 mois", m2_pain: "Voir leurs économies dormir sur Livret A pendant que l'inflation les ronge", m3_promesse: "Acquérir ton 1er bien locatif halal en 12 mois sans contracter le moindre prêt à intérêt", m3_mecanisme: "Mourabaha Property Path", m3_prix: "4 997€", m4_strategy: "ht_lt", m4_ht_target: 4 }),
  data: MOUNIA_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 9 · Younes · Setting/Closing (ROI 6x) ────────────────────────────
const YOUNES_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Scripts setting/closing + groupe Discord + 4 calls roleplay/mois + revue d'appels. Permet à un setter débutant de signer ses 12 premiers deals à 1 000€ de commission sur 12 mois. Le programme coûte 1 997€, le 2ème deal le rembourse.", signal_phrase: "Mon prix dit que je forme des setters sérieux qui veulent devenir closers — pas des collectionneurs de scripts.", ancrage_phrase: "Scripts + Discord setters + 4 calls roleplay/mois + revue d'appels + placement coach partenaire. Valeur totale 5 400€. Aujourd'hui 1 997€.", contraste_phrase: "12 mois à rester setter junior à 200€/mois = 9 600€ de manque à gagner cumulé.", non_excuse_phrase: "Le programme est à 1 997€. C'est l'investissement pour devenir closer." },
  prix_valeur: { resultat_client_12m: "12000", prix_ht: "1997", roi_calcule: 6, justification_chiffrage: "Le setter formé signe en moyenne 12 deals/an chez un coach partenaire à 1 000€ de commission par deal closé = 12 × 1 000 = 12 000€/an. Mécanique éprouvée sur la cohorte 2024 (8 setters formés, médiane 11 deals)." },
  prix_marche: { concurrents: [{ nom: "CloserAcademy · pack scripts", prix: "1400", url: "concurrent-close1.com" }, { nom: "SetterPro · formation + Discord", prix: "1600", url: "concurrent-close2.com" }, { nom: "HighTicketCloser · 8 sem", prix: "1500", url: "concurrent-close3.com" }], prix_marche_moyen: 1500, positionnement: "Premium · 1 997€ vs moyenne 1 500€ (+33%) — placement chez coach partenaire justifie l'écart." },
  prix_confiance: { confiance_sur_deliver: 80, prix_temporaire: "", doutes_principaux: "Je doute que mes cohortes de setters tiennent leurs résultats si le marché coaching ralentit. Je crains que mes coachs partenaires limitent leurs places de setters.", action_renforcement: "Cette semaine : signer 2 nouveaux coachs partenaires pour sécuriser les placements et relancer les 8 setters précédents pour leurs perfs S+30.", plan_augmentation: { prochain_palier_prix: 2300, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": true, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 666€/mois, sans riba. Tu démarres scripts et formation cette semaine — le 2ème deal closer rembourse déjà ton investissement." },
  bao: { bronze: { prix: "997", contenu_court: "Scripts setting/closing + objections + templates DM." }, argent: { prix: "1997", contenu_court: "Tout + groupe Discord setters + 4 calls roleplay/mois + revue d'appels." }, or: { prix: "3497", contenu_court: "Tout + accompagnement 1to1 + placement chez 1 coach partenaire." } },
  script_annonce: { script_text: "Mon programme forme des setters sérieux à devenir closers en 90 jours — commission moyenne 3 000€/mois après placement, soit 12 000€/an. Programme + groupe Discord + 4 calls roleplay + revue d'appels, valeur 5 500€. Aujourd'hui 1 997€. Mon prix dit que je forme des setters sérieux qui veulent devenir closers, pas des collectionneurs de scripts. Combien tu perds chaque mois sans monter en commission ? Sur 12 mois c'est 18 000€ de manque à gagner. Tu peux régler en 3 fois sans frais à 666€/mois, sans riba, et tu démarres scripts et formation cette semaine — le 2ème deal closer rembourse déjà ton investissement. Le programme est à 1 997€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const YOUNES_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Younes", niche: "Setting/closing pour entrepreneurs musulmans 20-30 ans qui veulent devenir closers premium", m2_pain: "Voir ses pairs gagner 3-5k€/mois pendant qu'il en gagne 1 400€", m3_promesse: "Devenir closer placé chez un entrepreneur musulman en 90 jours, commission moyenne 3 000€/mois", m3_mecanisme: "CLOSER AL BARAKA", m3_prix: "1 997€", m4_strategy: "ht_lt", m4_ht_target: 8 }),
  data: YOUNES_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 5 · Khadija · Mariage halal ──────────────────────────────────────
const KHADIJA_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Programme 12 modules audio + journal + 2 calls de groupe non-mixtes/mois. Permet à une sœur de clarifier ses critères et de filtrer en 3 mois ce qui prendrait 3 ans sans cadre. Un coaching individuel équivalent coûterait 7 500€.", signal_phrase: "Mon prix dit que j'accompagne des sœurs sérieuses dans leur projet de mariage halal — pas celles qui consomment du contenu.", ancrage_phrase: "Programme + journal + calls groupe + communauté privée + suivi post-mariage 3 mois. Valeur totale 4 800€. Aujourd'hui 1 497€.", contraste_phrase: "Une année supplémentaire d'incertitude = 12 mois de doute et d'occasions ratées.", non_excuse_phrase: "Le programme est à 1 497€. C'est l'investissement dans ta clarté." },
  prix_valeur: { resultat_client_12m: "7500", prix_ht: "1497", roi_calcule: 5, justification_chiffrage: "Équivalent d'un coaching individuel mariage halal : 15 séances × 500€ = 7 500€. Le programme livre les mêmes outils en format groupe + audio. La cliente économise un coaching individuel premium." },
  prix_marche: { concurrents: [{ nom: "NikahCoaching · pack 3 mois", prix: "1100", url: "concurrent-mariage1.com" }, { nom: "HalalLovePath · 12 modules", prix: "1300", url: "concurrent-mariage2.com" }, { nom: "ZawajGuide · accompagnement", prix: "1200", url: "concurrent-mariage3.com" }], prix_marche_moyen: 1200, positionnement: "Premium · 1 497€ vs moyenne 1 200€ (+25%) — accompagnement post-mariage + communauté privée justifient." },
  prix_confiance: { confiance_sur_deliver: 80, prix_temporaire: "", doutes_principaux: "Je doute que la communauté non-mixte tienne sur 12 mois sans modération active. Je crains que mes calls de groupe perdent en qualité au-delà de 25 personnes.", action_renforcement: "Cette semaine : recruter 2 modératrices bénévoles parmi mes anciennes élèves et formaliser une charte communauté.", plan_augmentation: { prochain_palier_prix: 1700, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 499€/mois, sans riba. Tu accèdes à la communauté et aux calls dès le 1er paiement." },
  bao: { bronze: { prix: "697", contenu_court: "12 modules audio + journal de bord." }, argent: { prix: "1497", contenu_court: "Tout + 2 calls de groupe non-mixtes/mois + communauté privée." }, or: { prix: "2997", contenu_court: "Tout + 4 sessions 1to1 + accompagnement post-mariage 3 mois." } },
  script_annonce: { script_text: "Mon programme accompagne 200 mariages halal réussis par an — économie moyenne 5 000€ par couple. Programme + calls de groupe non-mixtes + communauté privée + accompagnement, valeur 5 500€. Aujourd'hui 1 497€. Mon prix dit que j'accompagne des sœurs sérieuses dans leur projet de mariage halal, pas celles qui consomment du contenu. Combien tu perds en stress et erreurs sans accompagnement ? Sur 6 mois c'est des milliers d'euros et de la fatigue. Tu peux régler en 3 fois sans frais à 499€/mois, sans riba, et tu accèdes à la communauté et aux calls dès le 1er paiement. Le programme est à 1 497€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const KHADIJA_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Khadija", niche: "Femmes musulmanes 22-30 ans qui veulent se marier dans l'année avec un homme aligné spirituellement", m2_pain: "Peur de mal choisir et de subir un mariage qui finit en divorce ou en silence prolongé", m3_promesse: "Trouver et te marier avec un homme aligné spirituellement en 12 mois", m3_mecanisme: "Le chemin Khadija™", m3_prix: "1 497€", m4_strategy: "ht_only", m4_ht_target: 5 }),
  data: KHADIJA_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 6 · Aïcha & Tarek · Couple post-bébé ─────────────────────────────
const AICHA_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Programme Reset Couple : 8 modules audio + 1 call de groupe couples/mois. Permet à un couple post-bébé de retrouver une communication structurée en 60 jours. Coaching couple individuel équivalent + thérapie évitée = 5 000€ de valeur sur 12 mois.", signal_phrase: "Mon prix signale que j'accompagne des couples qui choisissent activement de réparer leur couple, pas de se plaindre.", ancrage_phrase: "Modules + cahier d'exercices + call de groupe + messagerie privée + plan personnalisé. Valeur totale 2 800€. Aujourd'hui 997€.", contraste_phrase: "Un couple qui dérive 12 mois sans cadre = thérapie 4 000€ à venir ou pire.", non_excuse_phrase: "Le programme est à 997€. C'est le prix du cadre que vous donnez à votre couple." },
  prix_valeur: { resultat_client_12m: "5000", prix_ht: "997", roi_calcule: 5, justification_chiffrage: "Économies sur thérapie de couple évitée : 8 séances × 80€ = 640€ + maintien de la stabilité familiale (productivité parentale, sommeil retrouvé). Valeur totale 12m estimée à 5 000€ sur base d'études d'attachement post-natal." },
  prix_marche: { concurrents: [{ nom: "CoupleAndKids · pack reset", prix: "750", url: "concurrent-couple1.com" }, { nom: "PostpartumDuo · 8 modules", prix: "850", url: "concurrent-couple2.com" }, { nom: "NewFamily · accompagnement", prix: "800", url: "concurrent-couple3.com" }], prix_marche_moyen: 800, positionnement: "Premium · 997€ vs moyenne 800€ (+25%) — messagerie privée + plan personnalisé." },
  prix_confiance: { confiance_sur_deliver: 78, prix_temporaire: "", doutes_principaux: "Je doute que mon call mensuel suffise face aux crises post-bébé qui demandent un suivi plus rapproché. Je crains que les couples décrochent sans le présentiel.", action_renforcement: "Cette semaine : tester un appel d'urgence 30min/sem avec 3 couples pilotes et documenter l'impact sur leur rétention.", plan_augmentation: { prochain_palier_prix: 1150, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 333€/mois, sans riba. Le couple démarre le programme dès aujourd'hui." },
  bao: { bronze: { prix: "497", contenu_court: "8 modules audio Reset Couple + cahier d'exercices papier." }, argent: { prix: "997", contenu_court: "Tout + 1 call de groupe couples/mois + messagerie privée." }, or: { prix: "1997", contenu_court: "Tout + 3 sessions 1to1 en couple + plan personnalisé." } },
  script_annonce: { script_text: "Mon programme sauve 80% des couples post-bébé que j'accompagne — thérapie classique à 80€/séance sur 12 mois c'est 4 000€. Programme complet + call de groupe couples + messagerie privée + suivi, valeur 4 000€. Aujourd'hui 997€. Mon prix signale que j'accompagne des couples qui choisissent activement de réparer leur couple, pas de se plaindre. Combien tu perds chaque mois où la tension monte sans rien faire ? Le coût du divorce moyen c'est 12 000€. Tu peux régler en 3 fois sans frais à 333€/mois, sans riba, et le couple démarre le programme dès aujourd'hui. Le programme est à 997€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const AICHA_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Aïcha & Tarek", niche: "Couples musulmans 28-38 ans avec un enfant <2 ans qui veulent retrouver complicité et intimité", m2_pain: "Vivre comme deux colocataires fatigués depuis la naissance du bébé", m3_promesse: "Retrouver 4 conversations vraies/semaine et 1 sortie de couple/mois en 8 semaines", m3_mecanisme: "Reset Couple™", m3_prix: "997€", m4_strategy: "ht_only", m4_ht_target: 6 }),
  data: AICHA_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 7 · Najet · Éducation positive ───────────────────────────────────
const NAJET_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Programme 8 modules + journal de bord cris/réactions + groupe WhatsApp non-mixte. Permet à une mère de couper le cycle des cris en 90 jours. Paix retrouvée + climat familial transformé + énergie économisée = 3 500€ de valeur facile sur 12 mois.", signal_phrase: "Mon prix dit que j'accompagne des mamans qui veulent vraiment couper le cycle des cris, pas qui cherchent des excuses.", ancrage_phrase: "Modules + journal + 2 lives mamans/mois + groupe WhatsApp + audit familial. Valeur totale 2 100€. Aujourd'hui 697€.", contraste_phrase: "Une année de plus à crier = enfants conditionnés à fuir, relation marquée à long terme.", non_excuse_phrase: "Le programme est à 697€. C'est le prix de ta paix de maman." },
  prix_valeur: { resultat_client_12m: "3500", prix_ht: "697", roi_calcule: 5, justification_chiffrage: "Économies réelles : 12 séances de thérapie familiale évitées × 80€ = 960€ + énergie maman retrouvée (2 nuits/sem × 30€ = 60€/sem × 40 sem = 2 400€). Total 12m ≈ 3 500€." },
  prix_marche: { concurrents: [{ nom: "ParentingCalm · pack 8 sem", prix: "550", url: "concurrent-parent1.com" }, { nom: "EducPositive · audio + lives", prix: "650", url: "concurrent-parent2.com" }, { nom: "MamansSereines · communauté", prix: "600", url: "concurrent-parent3.com" }], prix_marche_moyen: 600, positionnement: "Premium · 697€ vs moyenne 600€ (+16%) — groupe WhatsApp non-mixte + journal de bord justifient." },
  prix_confiance: { confiance_sur_deliver: 72, prix_temporaire: "", doutes_principaux: "Je doute que mes 8 modules suffisent pour les mamans avec plusieurs enfants en bas âge. Je crains que mon groupe WhatsApp devienne ingérable au-delà de 50 mamans.", action_renforcement: "Cette semaine : enregistrer un module bonus « adapter aux fratries » et recruter 1 modératrice WhatsApp.", plan_augmentation: { prochain_palier_prix: 800, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 233€/mois, sans riba — tu démarres les modules cette semaine et tu paies progressivement." },
  bao: { bronze: { prix: "297", contenu_court: "8 modules + journal de bord cris/réactions." }, argent: { prix: "697", contenu_court: "Tout + 2 lives mamans/mois + groupe WhatsApp non-mixte." }, or: { prix: "1497", contenu_court: "Tout + 4 calls 1to1 + audit familial personnalisé." } },
  script_annonce: { script_text: "Mon programme transforme la dynamique familiale en 90 jours — les mamans témoignent d'une réduction des cris de 70% par mois. Programme + lives mamans + groupe WhatsApp non-mixte + 8 modules, valeur 2 800€. Aujourd'hui 697€. Mon prix dit que j'accompagne des mamans qui veulent vraiment couper le cycle des cris, pas qui cherchent des excuses. Combien tu perds chaque mois en énergie et culpabilité sans méthode ? Sur 12 mois c'est des centaines d'heures de stress. Tu peux régler en 3 fois sans frais à 233€/mois, sans riba — tu démarres les modules cette semaine et tu paies progressivement. Le programme est à 697€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const NAJET_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Najet", niche: "Mères musulmanes 30-42 ans avec 2-4 enfants qui veulent une éducation ferme et bienveillante", m2_pain: "Crier 4-5 fois par jour puis pleurer le soir de culpabilité", m3_promesse: "Réduire les cris de 80% en 8 semaines, sans tomber dans le laxisme", m3_mecanisme: "Éducation Sereine™", m3_prix: "697€", m4_strategy: "ht_lt", m4_ht_target: 12 }),
  data: NAJET_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 8 · Salima · Perte de poids mamans ───────────────────────────────
const SALIMA_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Plan nutrition 16 semaines ramadan-adapté + groupe WhatsApp non-mixte + 2 lives/mois. Permet à une maman de perdre 8 à 12 kg sans frustration ni effet yoyo. Économies santé + confiance retrouvée + cycle stabilisé = 6 500€ de valeur sur 12 mois.", signal_phrase: "Mon prix signale un accompagnement nutrition sérieux et adapté religieusement — pas un régime express low-cost.", ancrage_phrase: "Plan nutrition + recettes ramadan + groupe + 2 lives/mois + plan workouts. Valeur totale 3 600€. Aujourd'hui 1 297€.", contraste_phrase: "Un an de plus à reprendre/perdre = effet yoyo, fatigue, démotivation cumulée.", non_excuse_phrase: "Le programme est à 1 297€. C'est l'investissement structuré sur ta santé." },
  prix_valeur: { resultat_client_12m: "6500", prix_ht: "1297", roi_calcule: 5, justification_chiffrage: "Économies vs nutritionniste : 12 séances × 70€ = 840€ + coût des régimes commerciaux évités 50€/mois × 12 = 600€ + frais santé évités 5 000€ sur l'année. Total 6 500€." },
  prix_marche: { concurrents: [{ nom: "NutritionMums · 16 sem", prix: "950", url: "concurrent-nutri1.com" }, { nom: "RamadanFit · plan adapté", prix: "1100", url: "concurrent-nutri2.com" }, { nom: "MaternalWellness · suivi 6m", prix: "1000", url: "concurrent-nutri3.com" }], prix_marche_moyen: 1017, positionnement: "Premium · 1 297€ vs moyenne 1 017€ (+27%) — plans ramadan-adaptés + 2 lives/mois justifient." },
  prix_confiance: { confiance_sur_deliver: 82, prix_temporaire: "", doutes_principaux: "Je doute que mes plans ramadan-adaptés couvrent toutes les variantes culturelles. Je crains que le ratio coach/clientes ne tienne pas si je passe 50 clientes simultanées.", action_renforcement: "Cette semaine : sonder 10 anciennes clientes sur leurs adaptations ramadan et rédiger 3 variantes culturelles supplémentaires.", plan_augmentation: { prochain_palier_prix: 1500, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": true, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 432€/mois, sans riba. Tu démarres le plan ramadan-adapté dès la 1ère mensualité." },
  bao: { bronze: { prix: "597", contenu_court: "Plan nutrition 16 semaines + recettes ramadan-adaptées." }, argent: { prix: "1297", contenu_court: "Tout + groupe WhatsApp non-mixte + 2 lives/mois + plan workouts." }, or: { prix: "2497", contenu_court: "Tout + suivi 1to1 hebdo + analyse repas perso + adaptation cycle." } },
  script_annonce: { script_text: "Mon programme fait perdre 8 kg en moyenne sur 4 mois aux mamans qui m'accompagnent — une diététicienne à 60€/séance sur 6 mois c'est 1 800€. Programme + plans ramadan + groupe WhatsApp non-mixte + 2 lives par mois, valeur 4 000€. Aujourd'hui 1 297€. Mon prix signale un accompagnement nutrition sérieux et adapté religieusement, pas un régime express low-cost. Combien tu perds en santé chaque mois sans plan ? Sur 12 mois c'est des kg en plus et l'énergie en moins. Tu peux régler en 3 fois sans frais à 432€/mois, sans riba, et tu démarres le plan ramadan-adapté dès la 1ère mensualité. Le programme est à 1 297€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const SALIMA_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Salima", niche: "Mamans musulmanes 28-42 ans post-accouchement qui veulent perdre 8-15kg en 6 mois", m2_pain: "Se voir grossir et plus rentrer dans rien depuis 2 ans après le 2e bébé", m3_promesse: "Perdre 8 à 12 kg en 16 semaines, ramadan inclus, sans frustration", m3_mecanisme: "Maman Légère™", m3_prix: "1 297€", m4_strategy: "ht_lt", m4_ht_target: 10 }),
  data: SALIMA_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 9 · Mehdi · Reprise sport 30+ ────────────────────────────────────
const MEHDI_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "Plan 12 semaines maison sans matériel + groupe WhatsApp hommes + 2 lives Q&A/mois. Permet à un homme 30+ de reprendre le sport sans salle, sans matériel. Énergie retrouvée + santé long terme + exemplarité paternelle = 4 500€ de valeur sur 12 mois.", signal_phrase: "Mon prix dit que je forme des hommes qui prennent leur santé au sérieux — pas qui cherchent une motivation passagère.", ancrage_phrase: "Plan + groupe WhatsApp + 2 lives/mois + plan nutrition + suivi posture. Valeur totale 2 600€. Aujourd'hui 897€.", contraste_phrase: "Un an de plus assis = dos cassé à 40 ans, fatigue chronique, prise de poids.", non_excuse_phrase: "Le programme est à 897€. C'est l'investissement minimal sur ta santé." },
  prix_valeur: { resultat_client_12m: "4500", prix_ht: "897", roi_calcule: 5, justification_chiffrage: "Économies vs coach personnel : 30 séances × 60€ = 1 800€ + abonnement salle évité 40€/mois × 12 = 480€ + frais santé évités à long terme (dos, fatigue) estimés 2 200€/an. Total 4 500€." },
  prix_marche: { concurrents: [{ nom: "HomeTraining 30+ · 12 sem", prix: "650", url: "concurrent-sport1.com" }, { nom: "DadFitness · plan complet", prix: "750", url: "concurrent-sport2.com" }, { nom: "BackInShape · pack hommes", prix: "700", url: "concurrent-sport3.com" }], prix_marche_moyen: 700, positionnement: "Premium · 897€ vs moyenne 700€ (+28%) — groupe WhatsApp hommes + lives Q&A justifient." },
  prix_confiance: { confiance_sur_deliver: 80, prix_temporaire: "", doutes_principaux: "Je doute que mes plans sans matériel tiennent face à des hommes avec gros déficit musculaire. Je crains que le format groupe WhatsApp manque de personnalisation.", action_renforcement: "Cette semaine : créer un module « adaptation profils sédentaires sévères » et enregistrer 3 vidéos de correction posture.", plan_augmentation: { prochain_palier_prix: 1050, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 299€/mois, sans riba. Tu démarres ton plan dès aujourd'hui et tu paies au fur et à mesure." },
  bao: { bronze: { prix: "397", contenu_court: "Plan 12 semaines maison sans matériel + plan nutrition." }, argent: { prix: "897", contenu_court: "Tout + groupe WhatsApp hommes + 2 lives Q&A/mois." }, or: { prix: "1797", contenu_court: "Tout + 4 calls 1to1 + suivi vidéo posture personnalisé." } },
  script_annonce: { script_text: "Mon programme remet en forme un homme sédentaire en 4 mois — un coach perso à 70€/séance sur 6 mois c'est 1 700€. Programme + groupe WhatsApp hommes + 2 lives par mois + plans sans matériel, valeur 2 800€. Aujourd'hui 897€. Mon prix dit que je forme des hommes qui prennent leur santé au sérieux, pas qui cherchent une motivation passagère. Combien tu perds chaque année en énergie et en confiance sans plan ? À 40 ans le corps ne pardonne plus rien. Tu peux régler en 3 fois sans frais à 299€/mois, sans riba, et tu démarres ton plan dès aujourd'hui et tu paies au fur et à mesure. Le programme est à 897€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const MEHDI_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Mehdi", niche: "Hommes musulmans 28-40 ans sédentaires depuis 3+ ans qui veulent reprendre le sport à la maison sans mixité", m2_pain: "Se sentir mou, à bout de souffle dans les escaliers", m3_promesse: "Reprendre le sport durablement à la maison en 12 semaines, sans mixité, sans matériel cher", m3_mecanisme: "Reprise Forte™", m3_prix: "897€", m4_strategy: "ht_only", m4_ht_target: 8 }),
  data: MEHDI_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── 10 · Lina · Anxiété étudiantes ───────────────────────────────────
const LINA_DATA: M6Data = {
  valeur_prix: { ma_bugatti: "12 modules audio + journal anxiété + exercices respiration + groupe non-mixte + 2 lives/mois. Permet à une étudiante de couper ses crises d'anxiété en 90 jours sans médicaments. Productivité retrouvée + semestre sauvé + diplôme assuré = 4 500€ de valeur sur 12 mois.", signal_phrase: "Mon prix signale un accompagnement structuré pour des étudiantes qui veulent vraiment sortir de l'anxiété, pas se rassurer.", ancrage_phrase: "Modules + journal + exercices respiration + groupe WhatsApp + 2 lives + suivi 6 mois. Valeur totale 2 400€. Aujourd'hui 897€.", contraste_phrase: "Un semestre raté à cause de l'anxiété = 3 000€ de frais + 6 mois de retard sur le diplôme.", non_excuse_phrase: "Le programme est à 897€. C'est l'investissement pour ta paix mentale." },
  prix_valeur: { resultat_client_12m: "4500", prix_ht: "897", roi_calcule: 5, justification_chiffrage: "Économies vs psychologue : 25 séances × 60€ = 1 500€ + semestre raté évité (frais réinscription + bourse maintenue) 2 000€ + productivité retrouvée sur jobs étudiants 80€/mois × 12 = 960€. Total ≈ 4 500€." },
  prix_marche: { concurrents: [{ nom: "AnxietyReset · pack étudiants", prix: "650", url: "concurrent-mental1.com" }, { nom: "CalmMindStudio · 12 modules", prix: "750", url: "concurrent-mental2.com" }, { nom: "BreatheBetter · audio + groupe", prix: "700", url: "concurrent-mental3.com" }], prix_marche_moyen: 700, positionnement: "Premium · 897€ vs moyenne 700€ (+28%) — 2 lives/mois + suivi 6 mois post-programme justifient." },
  prix_confiance: { confiance_sur_deliver: 78, prix_temporaire: "", doutes_principaux: "Je doute que mon programme suffise pour les anxiétés sévères type TAG diagnostiqué. Je crains que sans présentiel, certaines étudiantes décrochent en période de partiels.", action_renforcement: "Cette semaine : créer un module bonus « gérer les partiels » et tester un appel hebdomadaire 20min avec 5 étudiantes pilotes.", plan_augmentation: { prochain_palier_prix: 1050, declencheur_clients_satisfaits: 5, date_cible: "2026-11-15" } },
  paiements: { options: { "1x": true, "3x": true, "6x": false, "12x": false }, note_halal_acknowledged: true, pitch_fractionnement: "Tu peux régler en 3 fois sans frais à 299€/mois, sans riba. Tu démarres les modules dès aujourd'hui — sans alourdir ton budget étudiant." },
  bao: { bronze: { prix: "497", contenu_court: "12 modules audio + journal anxiété + exercices respiration." }, argent: { prix: "897", contenu_court: "Tout + 2 lives mensuels + groupe WhatsApp non-mixte étudiantes." }, or: { prix: "1797", contenu_court: "Tout + 4 calls 1to1 + suivi sur 6 mois + plan personnalisé." } },
  script_annonce: { script_text: "Mon programme accompagne 200 étudiantes anxieuses par an, sortie d'anxiété en 4 mois en moyenne — une psy à 50€/séance sur 8 mois c'est 1 600€. Programme + lives mensuels + groupe WhatsApp non-mixte étudiantes, valeur 2 500€. Aujourd'hui 897€. Mon prix signale un accompagnement structuré pour des étudiantes qui veulent vraiment sortir de l'anxiété, pas se rassurer. Combien tu perds chaque mois en concentration et en sommeil sans plan ? Sur 12 mois c'est un semestre raté. Tu peux régler en 3 fois sans frais à 299€/mois, sans riba, et tu démarres les modules dès aujourd'hui sans alourdir ton budget étudiant. Le programme est à 897€. C'est l'investissement." },
  commitment_no_price_drop: COMMIT_DEFAULT,
};
const LINA_PATCH: Partial<M6State> = {
  ...buildBase({ avatar: "Lina", niche: "Étudiantes musulmanes qui veulent gérer leur anxiété sans antidépresseurs", m2_pain: "Avoir des crises d'angoisse pendant les examens", m3_promesse: "Couper tes crises d'anxiété en 90 jours sans médicaments", m3_mecanisme: "Sereine Méthode", m3_prix: "897€", m4_strategy: "ht_lt", m4_ht_target: 10 }),
  data: LINA_DATA, scores: { ...FULL_SCORES }, attempts: FULL_ATTEMPTS, forced: NO_FORCED, highest: "lock",
};

// ── Liste finale 10 cas (tous bons cas, pas d'anti-pattern en M6) ────
export const M6_DEMO_CASES: M6DemoCase[] = [
  // ARGENT
  { key: "karim", segment: "argent", emoji: "💼", title: "Karim · Affiliation halal",
    summary: "ROI 6x · pricing premium parité+ · 2 997€ ht_lt (scores 84-92)", ready: true, patch: KARIM_PATCH },
  { key: "younes", segment: "argent", emoji: "🎯", title: "Younes · Setting & Closing",
    summary: "ROI 6x · scripts + suivi closer · 1 997€ ht_lt placement coach (scores 84-92)", ready: true, patch: YOUNES_PATCH },
  { key: "imen", segment: "argent", emoji: "📱", title: "Imen · SMMA modest fashion",
    summary: "ROI 9x · étudiantes ramp-up 2 mois · 1 997€ ht_lt (scores 84-92)", ready: true, patch: IMEN_PATCH },
  { key: "mounia", segment: "argent", emoji: "🏠", title: "Mounia & Anas · Immo halal",
    summary: "ROI 5x · patrimoine + cash flow · 4 997€ ht_lt 12x sans frais (scores 84-92)", ready: true, patch: MOUNIA_PATCH },

  // RELATIONS
  { key: "khadija", segment: "relations", emoji: "💍", title: "Khadija · Mariage halal",
    summary: "ROI 5x · niche claire · 1 497€ ht_only validation (scores 84-92)", ready: true, patch: KHADIJA_PATCH },
  { key: "aicha", segment: "relations", emoji: "👶", title: "Aïcha & Tarek · Couple post-bébé",
    summary: "ROI 5x · accessible parents · 997€ ht_only (scores 84-92)", ready: true, patch: AICHA_PATCH },
  { key: "najet", segment: "relations", emoji: "🧸", title: "Najet · Éducation positive",
    summary: "ROI 5x · accessible mamans · 697€ ht_lt veto conjugal (scores 84-92)", ready: true, patch: NAJET_PATCH },

  // SANTÉ
  { key: "salima", segment: "sante", emoji: "🌿", title: "Salima · Perte de poids mamans",
    summary: "ROI 5x · ramadan adapté · 1 297€ ht_lt saisonnier (scores 84-92)", ready: true, patch: SALIMA_PATCH },
  { key: "mehdi", segment: "sante", emoji: "💪", title: "Mehdi · Reprise sport 30+",
    summary: "ROI 5x · hommes maison non-mixité · 897€ ht_only (scores 84-92)", ready: true, patch: MEHDI_PATCH },
  { key: "lina", segment: "sante", emoji: "🌀", title: "Lina · Anxiété étudiantes",
    summary: "ROI 5x · accessible étudiantes · 897€ ht_lt (scores 84-92)", ready: true, patch: LINA_PATCH },
];
