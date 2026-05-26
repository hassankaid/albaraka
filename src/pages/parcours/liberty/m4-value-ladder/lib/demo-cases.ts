/**
 * Mode démo M4 — 10 cas pré-remplis (synchronisés M1/M2/M3 → M4).
 *
 * Transposition fidèle des `DEMO_LADDERS` Sidali v1.2.3 (HTML standalone).
 * 2 cas verbatim démarrés : Karim Affiliation Halal (bon cas ht_lt) + Lina
 * Anxiété Étudiants (anti-pattern full ladder fragile). Les 8 autres en
 * placeholder `ready: false` — à transcrire par lots ultérieurement comme on
 * a fait pour M3 (3+3+3).
 *
 * Mode démo : state non persisté en BDD (cf. usePersistedState).
 */

import type { M4State } from "./types";

export interface M4DemoCase {
  key: string;
  segment: "argent" | "relations" | "sante";
  emoji: string;
  title: string;
  summary: string;
  is_anti_pattern: boolean;
  ready: boolean;
  patch?: Partial<M4State>;
}

// ── 1 · Karim · Affiliation halal (bon cas, ht_lt) ─────────────────────────
const KARIM_AFFILIATION_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_argent_affiliation",
    sous_niche_2: {
      phrase: "Salariés musulmans 28-40 ans qui veulent générer 3000€/mois d'affiliation halal sans quitter leur CDI",
      phrase_finale: "Salariés musulmans 28-40 ans qui veulent générer 3000€/mois d'affiliation halal sans quitter leur CDI",
      cible: "Cadres salariés en CDI, mariés, 1-3 enfants",
      douleur: "Vivent du riba indirectement, veulent une source pure",
      methode: "Méthode AFFILIÉ AL BARAKA — 90 jours en 3 phases",
    },
    avatar: { socio: { nom: "Karim", age: "31 ans", situation: "Cadre marketing, marié, 2 enfants, 2 200€/mois", lieu: "Strasbourg" } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: {
    source: "module_2_psychologie",
    version: "demo_v1",
    data: {
      step8: {
        positionnement: "Le salarié musulman qui prend en main son indépendance financière sans compromis religieux",
        hook_principal: "Bâtir une source 100% halal qui te libère progressivement du salariat conventionnel",
        levier_secondaire: "preuve",
        biais_killer: "riba banking",
        phase_strategy: "phase 2 — déjà tenté 2-3 méthodes (dropshipping, freelancing) — toutes ont échoué par manque de cadre",
      },
    },
  },
  m3_data: {
    source: "module_3_anatomie",
    complete: true,
    market_type: "b2c_transfo",
    promesse: "De 0€ à 3 000€/mois d'affiliation 100% halal en 90 jours, sans quitter ton CDI",
    mecanisme: { nom: "Méthode AFFILIÉ AL BARAKA — 90 jours en 3 phases", etapes: ["Sélection produits halal validés", "Tunnel prospection LinkedIn + DM", "Commissions récurrentes"] },
    vehicule: { format: "90j · groupe 12 max · 2 lives/sem + Slack", justification: "Format groupe pour rentabilité + accountability", validated: true },
    garantie: { type: "continuite", formulation: "Si pas signé ton 1er affilié en 60j, je continue 60j gratuit jusqu'à signature" },
    urgence: { type: "cohorte_limitee", justification: "12 places groupe" },
    prix: { montant: "3500", levier_faible: "delai" },
    prix_score_global: 78,
  },
  ladder: {
    freemium: { id: "free_quiz_1000", name: "Quiz « Ton 1er 1 000€ d'affiliation halal »", price: "0€", format: "Quiz Tally 7 questions · 5 min · plan d'action emailé", rationale: "Qualifie sans friction et donne un premier livrable en 5 min." },
    low: { id: "low_dm_starter", name: "Mini-formation « Tes 3 premiers DM qui closent »", price: "47€", format: "5 vidéos + 12 scripts DM + Excel tracker · accès à vie", rationale: "Résout LE sous-problème : il ne sait pas démarrer. Justifiable face à l'épouse." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_90j", name: "AFFILIÉ AL BARAKA · 90 jours", price: "3 500€", format: "90j · groupe 12 max · 2 lives/sem + Slack + 4 calls 1-1", rationale: "Sommet : accompagnement dense pour atteindre 3 000€/mois en 90j. Issu de M3." },
  },
  bridges: {
    free_to_low: "Fin du quiz : page remerciement avec offre limitée 48h. « Tu as obtenu le score X — voici les 3 DM qu'il te faut, 27€ au lieu de 47€ ». Sur cohorte test : 30% conversion freemium → tripwire chez les salariés 28-40.",
    free_to_mid: "",
    free_to_high: "",
    low_to_mid: "",
    low_to_high: "Email J+10 du tripwire : « Tu as appliqué les 3 DM ? Si tu sens que ça marche et que tu veux 10× plus vite avec un accompagnement individuel, on ouvre 4 places pour AFFILIÉ AL BARAKA 90j. Call discovery pour voir si on bosse ensemble ». Conversion LT→HT ~3% mais ces 3% sont 100× plus qualifiés que les leads froids.",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "J'ai déjà signé 6 affiliés sur les 10 derniers mois et tous ont au moins doublé leurs revenus halal. Mon problème actuel, c'est que l'organique LinkedIn me ramène 30 leads/mois grand max et je remplis tout juste mes 4 places HT par trimestre. Je veux passer à 8 places par trimestre, ce qui veut dire doubler mon top of funnel. Un LT à 47€ va me servir à élargir la base ET à pré-éduquer — l'expérience montre qu'un acheteur tripwire est 5-10× plus probable de convertir en call HT qu'un téléchargeur de PDF gratuit. Mon indicateur de bascule : quand je remplis régulièrement 8 places HT/trim et que mon LT atteint 200 ventes/mois, je regarderai s'il faut ajouter un MT.",
    score: 88,
    feedback: "✓ Stratégie solide. Tu as identifié ton bottleneck (volume vs offer) et le levier (LT comme amplificateur de top of funnel). Tu as un indicateur de bascule précis (8 places/trim + 200 LT/mois). Le ratio 5-10× plus probable est issu de ton expérience — c'est exactement le niveau d'argumentation attendu.",
    ai_mode: "local",
    attempts: 1,
    forced: false,
    ht_monthly_target: "8 ventes HT/trimestre = ~2,7/mois à 3 500€ = ~9 300€/mois bruts",
    lt_breakeven_check: "LT 47€ avec CAC FB ads ~30-40€ = ~10€ de marge brute par LT. 200 LT/mois = 2 000€ qui amortit déjà les ads + reste positif. Pas en perte donc.",
  },
};

// ── 10 · Lina · Anxiété étudiants — ⚠ ANTI-PATTERN full ladder ───────────
const LINA_ANXIETE_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble",
  market_type: "b2c_transfo",
  m1_data: {
    source: "demo_sante_anxiete_etudiants",
    sous_niche_2: {
      phrase: "Étudiantes musulmanes 19-26 ans qui font des crises d'anxiété avant exams et culpabilisent religieusement de leur état",
      phrase_finale: "Étudiantes musulmanes 19-26 ans qui font des crises d'anxiété avant exams et culpabilisent religieusement de leur état",
      cible: "Étudiantes cursus exigeant, bourse modeste, parents primo-arrivants",
      douleur: "Culpabilité spirituelle, parents qui minimisent, bourse trop juste pour psy",
      methode: "ANXIÉTÉ & TAWAKKUL — protocole 6 mois en 3 niveaux",
    },
    avatar: { socio: { nom: "Lina", age: "22 ans", situation: "Psychologue clinicienne récente, encore en cabinet hospitalier, démarre côté solo", lieu: "Région parisienne" } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: {
    source: "module_2_psychologie",
    version: "demo_v1",
    data: {
      step8: {
        positionnement: "L'étudiante musulmane qui prend soin de sa santé mentale sans renoncer à sa foi",
        hook_principal: "Sortir durablement des crises en gardant son cursus, avec un cadre qui réconcilie TCC et tawakkul",
        levier_secondaire: "preuve",
        biais_killer: "culpabilité spirituelle",
        phase_strategy: "phase 2 — a consulté généraliste qui a proposé anxiolytiques (refus), cherche un cadre adapté",
      },
    },
  },
  m3_data: {
    source: "module_3_anatomie",
    complete: true,
    market_type: "b2c_transfo",
    promesse: "Sortir durablement de tes crises de panique en 6 mois, avec un cadre clinique TCC + tawakkul validé par savant",
    mecanisme: { nom: "ANXIÉTÉ & TAWAKKUL — protocole 6 mois en 3 niveaux", etapes: ["Reframing théologique", "Outils TCC", "Travail clinique 1-1"] },
    vehicule: { format: "6 mois · 6 séances 1-1 + masterclass mensuelles + Telegram étudiants + lettre parents arabe", justification: "Format clinique long pour ancrer durablement", validated: true },
    garantie: { type: "remboursement", formulation: "Si tu n'as pas réduit tes crises de 70% mesurées par échelle en 90 jours, je rembourse 50%" },
    urgence: { type: "cohorte_limitee", justification: "Petits groupes cliniques" },
    prix: { montant: "2500", levier_faible: "effort" },
    prix_score_global: 72,
  },
  ladder: {
    freemium: { id: "free_audio_tawakkul", name: "Podcast « Tu n'es pas une mauvaise musulmane si tu fais une crise »", price: "0€", format: "3 épisodes audio 30-45 min", rationale: "Reframing théologique avec savant. Débloque la culpabilité, condition de tout le reste." },
    low: { id: "low_protocole_exam", name: "Protocole TCC « Apaise tes crises avant exam »", price: "19€", format: "Vidéo 40 min + carnet PDF · accès à vie", rationale: "19€ = 1 repas étudiant. Protocole testable au prochain exam." },
    mid: { id: "mid_bootcamp_anxiete", name: "Bootcamp 30 jours « Psychoéducation + outils TCC »", price: "297€", format: "30 jours · 10 modules · 4 lives Q&A · groupe étudiants 60j", rationale: "1,5 mois de bourse — finançable parents si ROI scolaire montré." },
    high: { id: "high_anxiete_6m", name: "ANXIÉTÉ & TAWAKKUL · 6 mois clinique", price: "2 500€", format: "6 mois · 6 séances 1-1 + masterclass + lettre parents arabe", rationale: "Sommet : travail clinique 1-1 + lettre arabe aux parents pour débloquer financement." },
  },
  bridges: {
    free_to_low: "Fin du podcast : « Tu as compris que tu peux soigner ton anxiété sans renoncer à ta foi — voici le protocole TCC testable au prochain partiel, 19€ pendant 48h ». 36% de conversion.",
    free_to_mid: "",
    free_to_high: "",
    low_to_mid: "Email J+15 du tripwire : « Tu as utilisé le protocole en exam ? Bootcamp 30 jours pour la psychoéducation complète, 297€ ».",
    low_to_high: "",
    mid_to_high: "Live final J30 : « Tu as les outils et la compréhension. Pour le travail clinique sur 6 mois avec 6 séances individuelles + lettre arabe aux parents, programme professionnel à 2 500€ ».",
  },
  entry: {
    strategy: "full",
    rationale: "J'ai 9 étudiantes accompagnées et je veux pas perdre de temps. Le marché de la santé mentale étudiante explose, TikTok pousse les comptes mental health, et j'ai vu Sarah Knight et Mel Robbins construire des écosystèmes complets — il faut que je fasse pareil sinon je vais me faire prendre la place. J'ai déjà rédigé un draft du tripwire à 19€ et du bootcamp à 297€, donc autant lancer tout en même temps : le freemium podcast existe déjà, je peux assembler le LT en 2 semaines, le bootcamp en 4 semaines, et je tourne le HT à côté. Mes parents sont psy aussi donc j'ai du backup clinique. Je sens que c'est le moment.",
    score: 52,
    feedback: "✗ Stratégie incohérente avec ton stade et ta capacité. Tu as 9 étudiantes accompagnées. La règle empirique : tu valides un format avec 20+ clients HT avant de fragmenter. Trois alertes : (1) Référence Sarah Knight + Mel Robbins : ce sont des auteurs avec 100k+ followers et 10+ ans d'antériorité. Comparer ta phase de démarrage à leur écosystème mature est un piège. (2) Cohérence M3 : ton score Hormozi est à 72/100 — tu es en validation, pas en scale. Construire 4 marches en parallèle alors qu'aucune n'a 10 ventes va appauvrir chacune. (3) Capacité clinique : tu es psychologue, donc le delivery du HT n'est pas scalable mécaniquement (6 séances 1-1 par cliente × N clientes). Ajouter LT + MT te prend du temps de création de contenu = moins de temps de delivery HT. Recommandation IA : ht_only pendant 9-12 mois pour atteindre 25 étudiantes accompagnées et 8 témoignages vidéo (parents inclus). Ensuite : ht_lt avec le podcast comme freemium et la lettre parents arabe comme LT à 19€ — pas avant.",
    ai_mode: "local",
    attempts: 2,
    forced: false,
    ht_monthly_target: "2-3 ventes HT/mois à 2 500€ = 5 000-7 500€/mois bruts",
    lt_breakeven_check: "Pas calculé — l'élève n'a pas réfléchi à l'économie. Le LT à 19€ avec un CAC ads ~12€ en santé mentale étudiante laisserait 7€ de marge. À 50 LT/mois (volume réaliste à ce stade) = 350€/mois — ça ne couvre même pas les heures passées à créer les vidéos LT.",
  },
};

// ── 2 · Younes · setter — ⚠ ANTI-PATTERN full trop tôt ──────────────────
const YOUNES_SETTER_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_argent_setting_closing",
    sous_niche_2: {
      phrase: "Jeunes 20-28 ans en situation précaire qui veulent percer dans le setting/closing pour entrepreneurs musulmans",
      phrase_finale: "Jeunes 20-28 ans en situation précaire qui veulent percer dans le setting/closing pour entrepreneurs musulmans",
      cible: "Jeunes en petits boulots, ambitieux",
      douleur: "Salaire trop bas, plafond invisible",
      methode: "CLOSER AL BARAKA — protocole 90 jours en 4 phases",
    },
    avatar: { socio: { nom: "Younes", age: "24 ans", situation: "Livreur Uber Eats, célibataire, 1 400€/mois, vit chez ses parents", lieu: "Banlieue lyonnaise" } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "Le jeune qui sort de la précarité par le mérite et la skill, pas par la chance",
      hook_principal: "Devenir setter placé chez un entrepreneur musulman reconnu et toucher 2 500-4 000€/mois en commissions",
      levier_secondaire: "transformation",
      biais_killer: "plafond invisible",
      phase_strategy: "phase 1 — vient de signer ses 3 premiers clients HT, encore en phase d'apprentissage opérationnel",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "De livreur 1 400€ à setter placé à 3 000€/mois en 90 jours, avec un entrepreneur musulman partenaire",
    mecanisme: { nom: "CLOSER AL BARAKA — protocole 90 jours en 4 phases", etapes: ["Cadre éthique closing", "Scripts validés", "Roleplays", "Placement partenaire"] },
    vehicule: { format: "90j · cohorte 15 max · 3 lives/sem + roleplays + Slack", justification: "Format intensif pour transition rapide", validated: true },
    garantie: { type: "continuite", formulation: "Si pas placé chez un entrepreneur partenaire en 90j, je continue jusqu'à placement" },
    urgence: { type: "cohorte_limitee", justification: "15 places groupe" },
    prix: { montant: "2900", levier_faible: "probabilite" },
    prix_score_global: 75,
  },
  ladder: {
    freemium: { id: "free_quiz_setter", name: "Quiz « Es-tu fait pour le closing ? »", price: "0€", format: "Quiz 9 questions · 5 min", rationale: "Rassure Younes sur son profil avant de demander quoi que ce soit." },
    low: { id: "low_5_scripts", name: "5 scripts setter qui closent", price: "27€", format: "Scripts + roleplay", rationale: "Premier achat 27€." },
    mid: { id: "mid_bootcamp_setter", name: "Bootcamp 21j « Lance ton activité de setter »", price: "297€", format: "21j · 8 modules · 3 lives roleplay", rationale: "Couvre scripts + prospection." },
    high: { id: "high_closer_90j", name: "CLOSER AL BARAKA · 90 jours", price: "2 900€", format: "90j · cohorte 15 · placement entrepreneur partenaire", rationale: "Sommet : transition complète livreur → setter placé." },
  },
  bridges: {
    free_to_low: "Fin du quiz : « Tu as le profil setter — voici les 5 scripts qui closent à 27€ pendant 48h ».",
    free_to_mid: "", free_to_high: "",
    low_to_mid: "Email J+5 du tripwire : « Tu as les scripts. Pour la pratique en roleplay, le bootcamp 21j commence lundi, 297€ au lieu de 397€ ».",
    low_to_high: "",
    mid_to_high: "Live final J21 : « Tu as fait tes 100 contacts/jour pendant 21 jours, tu as la base. L'étape suivante c'est le placement chez un entrepreneur partenaire ».",
  },
  entry: {
    strategy: "full",
    rationale: "Je suis sur TikTok et Iman Gadzhi montre clairement que les meilleurs ont une full ladder dès le départ. Si je veux scaler vite, je dois tout construire en même temps : un quiz freemium, le tripwire 27€, le bootcamp 297€ et le programme 90j à 2 900€. L'algo TikTok favorise les comptes qui ont plusieurs offres pour différents budgets. Je commence à avoir une audience qui grossit (45k abonnés en 4 mois) et je veux capitaliser maintenant. J'ai 3 clients HT signés et 2 en bootcamp, je sens que c'est le moment.",
    score: 54,
    feedback: "✗ Stratégie incohérente avec ton stade. Tu as 3 clients HT signés. La règle empirique : 10 happy clients HT minimum avant de fragmenter ton attention sur d'autres marches. Avec full ladder, tu vas devoir : (1) maintenir le bootcamp 21j en cohorte, (2) faire vivre une communauté tripwire, (3) animer un quiz freemium qui qualifie, (4) délivrer ton HT à 2 900€. Tu n'as pas la bande passante pour faire les 4 correctement. ⚠ Cohérence M3 : avec un score Hormozi M3 à 75/100, ton HT est encore en validation — ajouter MT+LT+freemium en même temps va te disperser et appauvrir chacune des 4 marches. Iman Gadzhi a construit son full ladder APRÈS avoir signé 100+ clients HT à 5k€ chacun. Tu en as signé 3. Recommandation : ht_only pendant 6 mois pour atteindre 10 happy clients, puis ht_lt à partir de là.",
    ai_mode: "local", attempts: 2, forced: false,
    ht_monthly_target: "4-5 ventes HT/mois à 2 900€ = 11-14k€/mois bruts",
    lt_breakeven_check: "Je n'ai pas calculé — je pensais que le LT à 27€ se vendrait tout seul via TikTok organic.",
  },
};

// ── 3 · Imen · SMMA étudiantes (bon cas ht_lt) ──────────────────────────
const IMEN_SMMA_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_argent_smma_etudiants",
    sous_niche_2: {
      phrase: "Étudiantes musulmanes 19-25 ans qui veulent monter une agence SMMA ciblée PME halal locales",
      phrase_finale: "Étudiantes musulmanes 19-25 ans qui veulent monter une agence SMMA ciblée PME halal locales",
      cible: "Étudiantes en bourse, ambitieuses",
      douleur: "Bourse juste, pas d'horizon pro clair",
      methode: "AGENCE SMMA AL BARAKA — 90 jours pour tes 3 premiers clients",
    },
    avatar: { socio: { nom: "Imen", age: "21 ans", situation: "Étudiante psycho L2, coloc, 350€/mois bourse", lieu: "Lille" } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "L'étudiante musulmane qui prouve qu'on peut allier études + entrepreneuriat éthique",
      hook_principal: "Monter ton agence SMMA halal à 3 000€/mois en 18 mois, en parallèle des études",
      levier_secondaire: "preuve",
      biais_killer: "syndrome de l'imposteur étudiante",
      phase_strategy: "phase 2 — a appris les bases SMMA en autodidacte, bloque sur la prospection",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "De 350€/mois étudiante à 3 premiers clients SMMA en 90 jours · format 100% filles",
    mecanisme: { nom: "AGENCE SMMA AL BARAKA — 90 jours pour tes 3 premiers clients", etapes: ["Choix niche locale halal", "Prospection cadrée", "Onboarding 1er client", "Stabilisation 3 clients"] },
    vehicule: { format: "90j · groupe 8 filles max · 3 lives/sem · audit perso", justification: "Format filles rassure parents + étudiantes pratiquantes", validated: true },
    garantie: { type: "continuite", formulation: "1er client signé en 60j ou bootcamp suivant gratuit" },
    urgence: { type: "cohorte_limitee", justification: "8 places filles uniquement" },
    prix: { montant: "2700", levier_faible: "probabilite" },
    prix_score_global: 76,
  },
  ladder: {
    freemium: { id: "free_quiz_smma", name: "Quiz « Quelle niche SMMA pour toi ? »", price: "0€", format: "Quiz Tally 8 questions · 5 min", rationale: "Donne une direction concrète en 5 min." },
    low: { id: "low_audit", name: "Mini-audit Instagram + 1ère prospection", price: "19€", format: "Vidéo 45 min + template audit + 1 prospection guidée", rationale: "Budget courses. Premier achat qui prouve la valeur." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_agence_90j", name: "AGENCE SMMA AL BARAKA · 90j", price: "2 700€", format: "90j · 8 filles max · 3 lives/sem · audit personnalisé", rationale: "Sommet : 3 clients signés garantis avec accompagnement dense." },
  },
  bridges: {
    free_to_low: "Fin du quiz : « Tu as ta niche — voici l'audit pour démarrer ta première prospection ce soir, 19€ pendant 48h ». 28% conversion freemium → tripwire.",
    free_to_mid: "", free_to_high: "", low_to_mid: "",
    low_to_high: "Email J+10 du tripwire : « Tu as fait ton audit et ta première prospection. Si tu veux qu'on signe 3 clients en 90j ensemble, on ouvre 4 places pour le programme — call discovery pour évaluer ton profil ».",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "En 14 mois j'ai accompagné 8 étudiantes au bout de la transformation, 5 témoignages vidéo, garantie « 1er client en 60j » honorée à chaque fois. Mon vrai souci c'est que je plafonne à 30 leads qualifiés/mois sur Instagram et avec 4 places HT par cohorte, je suis vite saturée. Un LT à 19€ « audit + 1 prospection » me servira à filtrer les sérieuses des curieuses (et 19€ ça passe le budget courses de leurs parents). L'indicateur que ça marche : si j'arrive à 80 leads chauds qualifiés/mois et 12 places HT par trim, c'est gagné.",
    score: 87,
    feedback: "✓ Stratégie cohérente avec ton stade. Tu as 8 transformations documentées + 5 témoignages vidéo (cohérent avec ton angle preuve M3). Le LT à 19€ a une fonction claire (filtre qualité + premier achat). L'indicateur de bascule (80 leads, 12 places/trim) est concret. HT + LT est le bon choix.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "12 places HT/trim = 4/mois à 2 700€ = 10 800€/mois bruts",
    lt_breakeven_check: "LT 19€ avec CAC organique ~0€ (vente via story Instagram) = 19€ de marge. Si ads : CAC ~15€, marge 4€ — quasi breakeven mais filtre énorme côté qualification.",
  },
};

// ── 4 · Mounia & Anas · Immo sans riba (bon cas ht_lt économie pointue) ──
const MOUNIA_ANAS_IMMO_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_argent_immo_sans_riba",
    sous_niche_2: {
      phrase: "Couples musulmans 30-45 ans en location qui refusent le crédit conventionnel et veulent acheter leur RP cash",
      phrase_finale: "Couples musulmans 30-45 ans en location qui refusent le crédit conventionnel et veulent acheter leur RP cash",
      cible: "Couples avec enfants",
      douleur: "Bloqués dans la location à perte, refusent le riba",
      methode: "RP HALAL — méthode 5 piliers en 24 mois",
    },
    avatar: { socio: { nom: "Mounia & Anas", age: "33 & 36 ans", situation: "Mariés, 3 enfants 2-7-9 ans, 4 800€/mois combinés, 32k€ épargne", lieu: "Région Rennes" } },
    marche: { id: "argent", label: "💰 Argent" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "Le couple musulman pragmatique qui prouve qu'on peut être propriétaire sans compromis",
      hook_principal: "Acheter votre résidence principale 100% cash en 5-6 ans max, en gardant votre halal intact",
      levier_secondaire: "transformation",
      biais_killer: "riba conventionnel",
      phase_strategy: "phase 2 — ont déjà étudié plusieurs solutions, aucune ne les a convaincus",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Acheter votre résidence principale 100% cash en 24-60 mois selon votre situation, sans aucun crédit",
    mecanisme: { nom: "RP HALAL — méthode 5 piliers en 24 mois", etapes: ["Audit financier couple", "Plan d'épargne accélérée", "Stratégies revenus complémentaires", "Recherche RP optimisée", "Accompagnement acte"] },
    vehicule: { format: "18 mois · couples uniquement · 2 calls couple/mois + masterclass + Telegram", justification: "Format long pour suivre l'acquisition", validated: true },
    garantie: { type: "continuite", formulation: "Si en 24 mois pas réduit votre échéance d'au moins 12 mois, accompagnement gratuit jusqu'à l'objectif" },
    urgence: { type: "cohorte_limitee", justification: "6 places couples par session" },
    prix: { montant: "4200", levier_faible: "delai" },
    prix_score_global: 82,
  },
  ladder: {
    freemium: { id: "free_simulateur", name: "Simulateur « En combien tu peux acheter cash ? »", price: "0€", format: "Outil interactif Notion · 5 min · projection emailée", rationale: "Confronte le couple à ses chiffres et crée le déclic en 5 min." },
    low: { id: "low_audit_24h", name: "Audit financier RP halal sous 24h", price: "47€", format: "Formulaire + retour vidéo 12 min sous 24h", rationale: "47€ pour audit perso = ROI évident." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_rp_18m", name: "RP HALAL · 18 mois jusqu'à l'acte", price: "4 200€", format: "18 mois · couples uniquement · 2 calls couple/mois + audits + Telegram", rationale: "Sommet : accompagnement long jusqu'à l'acte d'achat." },
  },
  bridges: {
    free_to_low: "Fin du simulateur : « Voici votre projection — pour un audit personnalisé sous 24h avec 3 actions concrètes, 47€ pendant 48h ». 32% conversion freemium → tripwire.",
    free_to_mid: "", free_to_high: "", low_to_mid: "",
    low_to_high: "Email J+10 du tripwire : « Vous avez votre audit. Si vous voulez l'accompagnement personnalisé jusqu'à l'acte d'achat, on ouvre 6 places couples pour le programme 18 mois — webinaire d'info couples cette semaine ».",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "J'ai accompagné 15 couples jusqu'à l'acte sur 3 ans, c'est du solide. Mon vrai problème : le CAC. Un couple HT à 4 200€ me coûte ~800€ en Facebook ads aujourd'hui (cible étroite : musulman + couple + revenu 4-8k). Donc marge brute par couple = 3 400€ — pas catastrophique mais ça limite le scale. Le LT à 47€ « audit 24h » me permet de récupérer mes ads dès le tripwire (47€ - 30€ CAC tripwire = 17€/audit) ET chaque acheteur LT est un futur prospect HT chaud. Le freemium-simulateur tourne déjà bien (200 leads/mois) — je veux que 30% le convertissent en LT et 5% des LT achètent le HT. Indicateur de bascule : si LT atteint 500 ventes/mois et que le CAC HT chute sous 400€, je regarderai un MT.",
    score: 92,
    feedback: "✓ Stratégie exemplaire. Tu as fait l'analyse économique réelle (CAC vs marge, ratio LT → HT). Le LT n'est pas « une autre source de revenus » mais bien un outil de réduction du CAC HT — c'est la bonne logique. Tu as un indicateur de bascule chiffré pour passer à HT+LT+MT. Niveau de raisonnement à ce stade : exemplaire.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "4 ventes HT/mois à 4 200€ = 16 800€/mois bruts",
    lt_breakeven_check: "LT 47€ avec CAC ads 30€ = 17€ marge brute par audit. 200 LT/mois = 3 400€ qui compensent déjà mes ads. Pas en perte du tout.",
  },
};

// ── 5 · Khadija · Mariage halal (bon cas ht_only par cohérence preuve) ──
const KHADIJA_MARIAGE_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_relations_mariage_halal",
    sous_niche_2: {
      phrase: "Sœurs musulmanes 25-35 ans qui ont tenté plusieurs fois sans succès et veulent une méthode structurée pour rencontrer leur époux",
      phrase_finale: "Sœurs musulmanes 25-35 ans qui ont tenté plusieurs fois sans succès et veulent une méthode structurée pour rencontrer leur époux",
      cible: "Sœurs pratiquantes, professionnelles établies",
      douleur: "Doutent après plusieurs échecs et craignent d'être « le problème »",
      methode: "MARIAGE HALAL — méthode en 3 phases",
    },
    avatar: { socio: { nom: "Khadija", age: "28 ans", situation: "Prof primaire, célibataire, 2 100€/mois, 4 ruptures de fiançailles", lieu: "Marseille" } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "La sœur qui prend la responsabilité de son destin marital sans attendre passivement",
      hook_principal: "Rencontrer ton époux compatible religieusement et humainement en 12 mois maximum",
      levier_secondaire: "preuve",
      biais_killer: "doute identitaire post-ruptures",
      phase_strategy: "phase 2 — tenté seule, parfois avec matchmaker, sans cadre méthodique",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Rencontrer ton époux compatible religieusement et humainement en 12 mois, sans répéter tes erreurs passées",
    mecanisme: { nom: "MARIAGE HALAL — méthode en 3 phases", etapes: ["Bilan identité conjugale", "Cadre méthodique recherche", "Suivi rencontres jusqu'au mariage"] },
    vehicule: { format: "12 mois · 1 call/mois + masterclass + sisters group + accès matchmakers partenaires", justification: "Format long pour suivre toute la trajectoire d'une rencontre", validated: true },
    garantie: { type: "remboursement", formulation: "Si tu ne rencontres pas au moins 3 candidats compatibles à tes critères en 6 mois, je rembourse 50%" },
    urgence: { type: "cohorte_limitee", justification: "8 sœurs par cohorte de 6 mois" },
    prix: { montant: "3200", levier_faible: "delai" },
    prix_score_global: 74,
  },
  ladder: {
    freemium: { id: "free_quiz_pretes", name: "Quiz « Es-tu vraiment prête au mariage halal ? »", price: "0€", format: "Quiz Tally 12 questions · 7 min · diagnostic 4 dimensions emailé", rationale: "Donne un diagnostic structuré qui calme l'angoisse et met en mouvement." },
    low: { id: "", name: "", price: "", format: "", rationale: "" },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_mariage_12m", name: "MARIAGE HALAL · 12 mois jusqu'à la rencontre", price: "3 200€", format: "12 mois · 1 call/mois + matchmakers + sisters group + masterclass mensuelles", rationale: "Sommet : accompagnement long + accès au réseau privé de matchmakers partenaires." },
  },
  bridges: {
    free_to_low: "", free_to_mid: "",
    free_to_high: "Suite du quiz : on dirige les sœurs vers un webinaire 60 min mensuel « Les 5 phases du parcours mariage halal », suivi d'un call discovery 30 min. Pas de tripwire intermédiaire — l'audience est sensible, mieux vaut un funnel court et qualitatif. Conversion quiz → discovery call ~12%, conversion call → HT ~25%.",
    low_to_mid: "", low_to_high: "", mid_to_high: "",
  },
  entry: {
    strategy: "ht_only",
    rationale: "J'ai 6 mariages confirmés sur les 18 derniers mois, et tous mes témoignages sont des sœurs mariées qui parlent de leur parcours. Mon marketing repose à 100% sur cette preuve sociale — pour multiplier les témoignages je dois multiplier les mariages, donc le HT. Tant que je n'ai pas franchi les 10 mariages confirmés je vais résister à l'envie de monter un tripwire qui me disperserait. Mon indicateur de bascule : quand j'atteins 10 mariages et que j'ai 3 témoignages vidéo dont une couple ensemble, là je regarderai un tripwire à 17€ type « 50 questions à poser en entretien » pour élargir le top of funnel.",
    score: 86,
    feedback: "✓ Stratégie cohérente avec ton angle marketing. Tu as relié ton angle M3 (preuve sociale via mariages confirmés) à la décision de prioriser le HT — c'est exactement le bon raisonnement. L'indicateur de bascule est concret (10 mariages + 3 vidéos). Continue ainsi.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "8 places HT par cohorte de 6 mois = 1,3/mois à 3 200€ = ~4 200€/mois bruts",
    lt_breakeven_check: "Non applicable — pas de LT à ce stade.",
  },
};

// ── 6 · Aïcha & Tarek · Couple post-bébé (bon cas ht_only par sensibilité) ─
const AICHA_TAREK_COUPLE_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_relations_couple_post_bebe",
    sous_niche_2: {
      phrase: "Couples musulmans 30-45 ans avec enfants en bas âge qui sentent leur relation s'éroder mais ne savent pas comment en parler",
      phrase_finale: "Couples musulmans 30-45 ans avec enfants en bas âge qui sentent leur relation s'éroder mais ne savent pas comment en parler",
      cible: "Couples mariés depuis 8-15 ans, 2-4 enfants",
      douleur: "Communication réduite à la logistique, intimité quasi-disparue, frustration silencieuse",
      methode: "RETROUVAILLES — protocole 6 mois en 3 niveaux",
    },
    avatar: { socio: { nom: "Aïcha & Tarek", age: "34 & 37 ans", situation: "Mariés 11 ans, 3 enfants 2-5-8, revenus combinés 6 400€", lieu: "Région bordelaise" } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "Le couple musulman qui ose travailler sur sa relation au lieu de laisser pourrir",
      hook_principal: "Retrouver une vraie connexion conjugale sans passer par une thérapie occidentale qui ignore le cadre religieux",
      levier_secondaire: "transformation",
      biais_killer: "tabou conjugal communautaire",
      phase_strategy: "phase 1 — tournent en rond, n'ont jamais consulté ensemble",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Reconstruire votre couple (communication + intimité) en 6 mois, dans un cadre 100% halal et confidentiel",
    mecanisme: { nom: "RETROUVAILLES — protocole 6 mois en 3 niveaux", etapes: ["Diagnostic communication", "Reconstruction langage couple", "Rétablissement intimité halal"] },
    vehicule: { format: "6 mois · 1 call couple/mois + masterclass couples + Telegram + ressources audio", justification: "Format long pour aborder l'intimité après reconstruction communication", validated: true },
    garantie: { type: "remboursement", formulation: "Si vous ne voyez pas d'amélioration mesurable en 90 jours, je rembourse 100%" },
    urgence: { type: "cohorte_limitee", justification: "Suivi couple personnalisé limité" },
    prix: { montant: "3600", levier_faible: "effort" },
    prix_score_global: 79,
  },
  ladder: {
    freemium: { id: "free_audio_couple", name: "Podcast 3 épisodes « Quand le couple meurt en silence »", price: "0€", format: "3 épisodes audio 40-60 min · à écouter en couple", rationale: "Format audio idéal : pas d'engagement, peut être écouté à deux dans la voiture." },
    low: { id: "", name: "", price: "", format: "", rationale: "" },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_retrouvailles_6m", name: "RETROUVAILLES · 6 mois couple complet", price: "3 600€", format: "6 mois · 1 call couple/mois + masterclass couples + Telegram + ressources audio", rationale: "Sommet : reconstruction communication ET intimité, cadre 100% halal." },
  },
  bridges: {
    free_to_low: "", free_to_mid: "",
    free_to_high: "Fin de l'épisode 3 du podcast : invitation au webinaire couple privé « Les 4 phases d'érosion conjugale » (90 min en couple), suivi d'un call discovery couple gratuit 45 min. Le funnel reste court et qualitatif. Conversion podcast → webinaire ~8%, conversion webinaire → call ~30%, conversion call → HT ~35%.",
    low_to_mid: "", low_to_high: "", mid_to_high: "",
  },
  entry: {
    strategy: "ht_only",
    rationale: "J'ai 12 couples accompagnés jusqu'au bout sur 24 mois, et la spécificité de cette niche c'est que les couples ne parlent à personne — quand ils franchissent le pas de payer 3 600€, c'est qu'ils sont au bord du divorce. Un tripwire à 27€ « 5 questions à poser ce soir » risquerait de banaliser le sujet et d'attirer du curieux qui consomme sans agir. Je préfère un funnel court (podcast → webinaire couple → call discovery) qui qualifie en profondeur. L'organique Instagram me ramène 25 prospects sérieux par mois pour 8 places HT, donc je ne suis pas saturée. Je bascule vers HT+MT (pas LT) quand j'ai 25 couples accompagnés et que je vois une demande pour une version « sans call individuel ».",
    score: 84,
    feedback: "✓ Stratégie défendable et fine. Tu as fait l'analyse psychologique de ta cible (couples ultra-prudents, le LT banaliserait) et tu en as tiré la bonne conclusion. Le funnel court est cohérent. L'indicateur de bascule envisage ht_mt plutôt que ht_lt — ce qui est exactement le bon réflexe pour cette niche.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "6-8 couples HT/cohorte de 6 mois = 1-1,3/mois à 3 600€ = 4 200-4 800€/mois bruts",
    lt_breakeven_check: "Non applicable — pas de LT. Le calcul à venir sera plutôt MT 597€ avec marge brute ~500€ et target 4 ventes MT/mois pour compenser l'absence de 1 couple HT.",
  },
};

// ── 7 · Najet · Éducation positive (bon cas ht_lt avec insight conjugal) ─
const NAJET_EDUCATION_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_relations_education_positive",
    sous_niche_2: {
      phrase: "Mères musulmanes 28-42 ans qui crient sur leurs enfants et culpabilisent religieusement de leur impatience",
      phrase_finale: "Mères musulmanes 28-42 ans qui crient sur leurs enfants et culpabilisent religieusement de leur impatience",
      cible: "Mamans au foyer ou pause carrière, 2-5 enfants, budget restreint",
      douleur: "Culpabilité chronique + mari souvent réticent à investir",
      methode: "MAMA SEREINE — méthode 3 piliers en 90 jours",
    },
    avatar: { socio: { nom: "Najet", age: "35 ans", situation: "Mère au foyer 4 enfants 2-5-8-11, mariée, dépend du salaire mari (3 200€)", lieu: "Banlieue parisienne" } },
    marche: { id: "relations", label: "🤝 Relations" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "La maman musulmane qui prend la responsabilité de son tempérament",
      hook_principal: "Devenir la mère apaisée qu'elle voudrait être, dans le cadre de la pédagogie prophétique",
      levier_secondaire: "transformation",
      biais_killer: "culpabilité religieuse",
      phase_strategy: "phase 2 — a lu 5 livres d'éducation positive sans arriver à appliquer",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Arrêter de crier sur tes enfants en 90 jours, dans le cadre de la pédagogie prophétique, sans culpabilité religieuse",
    mecanisme: { nom: "MAMA SEREINE — méthode 3 piliers en 90 jours", etapes: ["Régulation émotionnelle", "Outils pédagogie prophétique", "Ancrage routine apaisée"] },
    vehicule: { format: "90 jours · 2 lives/mois + audits individuels + Telegram mamans + workbook", justification: "Format hybride asynchrone + lives groupe + audits", validated: true },
    garantie: { type: "continuite", formulation: "Si en 90 jours tu n'as pas réduit tes cris d'au moins 70% mesurés par journal, je continue gratuitement" },
    urgence: { type: "cohorte_limitee", justification: "6 places par session" },
    prix: { montant: "2500", levier_faible: "delai" },
    prix_score_global: 73,
  },
  ladder: {
    freemium: { id: "free_journee_test", name: "Défi gratuit « 24h sans crier »", price: "0€", format: "Email matin + journal PDF · bilan le soir + invitation live", rationale: "Le défi prouve à Najet qu'elle PEUT changer en 1 journée — déclic immédiat." },
    low: { id: "low_5_phrases", name: "5 phrases magiques anti-cri", price: "17€", format: "PDF 24 pages + 5 cartes imprimables · accès à vie", rationale: "17€ passe sans débat conjugal (= un thé). Premier achat qui ouvre l'écosystème." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_mama_90j", name: "MAMA SEREINE · 90 jours", price: "2 500€", format: "90 jours · 2 lives/mois + audits individuels + Telegram mamans", rationale: "Sommet : transformation durable avec pédagogie prophétique + audits individuels." },
  },
  bridges: {
    free_to_low: "Fin du défi 24h : « Tu as tenu la journée — pour transformer ça en routine 7 jours, voici 5 phrases magiques anti-cri à 17€ pendant 48h ». 38% de conversion freemium → tripwire (cible engagée par le défi). Le 17€ est calibré pour passer le radar du mari (= une boîte de gâteaux).",
    free_to_mid: "", free_to_high: "", low_to_mid: "",
    low_to_high: "Email J+10 du tripwire : « Tu as les 5 phrases ? Maintenant ton mari voit que ça marche. Pour aller plus loin (régulation émotionnelle + pédagogie prophétique au quotidien), j'ouvre 6 places dans MAMA SEREINE — webinaire de présentation cette semaine, échelonné en 5×550€ ». Conversion LT → HT ~4% sur 90 jours.",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "J'ai 22 mamans accompagnées avec transformation mesurée (journal anti-cri). Mon vrai blocage n'est pas le prix mais le veto du mari sur les achats > 50€ — c'est culturel et c'est partout dans ma cible. Un tripwire à 17€ (= équivalent boîte de gâteaux) passe sous le radar, permet à la maman de tester, et surtout lui donne une preuve à montrer à son mari avant de proposer le HT à 5×550€. C'est pas un volume play, c'est un play de friction conjugale. Mes Reels Instagram ramènent ~1 500 leads/mois (le défi 24h cartonne), j'ai donc largement de quoi nourrir un LT. Indicateur de bascule : quand le LT atteint 300 ventes/mois et que je vois 10% des acheteuses LT poser des questions sur la suite, j'ouvre un MT à 297€.",
    score: 91,
    feedback: "✓ Stratégie excellente. Tu as identifié un mécanisme spécifique à ta cible (le veto conjugal sur les achats) et conçu le LT comme outil de contournement de cette friction — pas comme source de revenus. C'est exactement le niveau de psychologie commerciale qui distingue une stratégie d'une intuition.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "4-5 ventes HT/mois à 2 500€ = 10-12k€/mois bruts",
    lt_breakeven_check: "LT 17€ avec CAC organique ~0€ via Reels = 17€ marge brute. Si ads test : CAC ~8€, marge ~9€. Cible 300 ventes/mois = 2 700€/mois qui finance amplement les ads. Pas en perte du tout.",
  },
};

// ── 8 · Salima · Perte de poids mamans (bon cas ht_lt saisonnier ramadan) ─
const SALIMA_PERTE_POIDS_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_sante_perte_poids_mamans",
    sous_niche_2: {
      phrase: "Mamans musulmanes 30-45 ans qui veulent perdre 10-25 kg dans un cadre halal compatible hijab et ramadan",
      phrase_finale: "Mamans musulmanes 30-45 ans qui veulent perdre 10-25 kg dans un cadre halal compatible hijab et ramadan",
      cible: "Mamans actives multi-tentatives échouées",
      douleur: "Sentiment d'avoir tout essayé, fatigue du yo-yo",
      methode: "AL BARAKA FIT — méthode adaptée hijab + 6 mois",
    },
    avatar: { socio: { nom: "Salima", age: "37 ans", situation: "Maman 3 enfants 4-7-10, mi-temps comptable, 2 900€/mois, 15 kg à perdre", lieu: "Roubaix" } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "La maman qui prend soin d'elle SANS s'éloigner de sa pratique ni de sa famille",
      hook_principal: "Perdre 15 kg durablement dans un cadre adapté à sa vie de maman musulmane",
      levier_secondaire: "transformation",
      biais_killer: "syndrome yo-yo + culpabilité familiale",
      phase_strategy: "phase 3 — Dukan + WW + salle + 2 coachings, tous échoués par incompatibilité",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Perdre 12-25 kg durablement en 6 mois, sans abandonner ton hijab ni les repas famille, avec gestion ramadan incluse",
    mecanisme: { nom: "AL BARAKA FIT — méthode adaptée hijab + 6 mois", etapes: ["Audit métabolique", "Plan nutritionnel halal famille", "Activité compatible hijab", "Gestion ramadan sans rebond"] },
    vehicule: { format: "6 mois · 1 call/mois + audit nutritionnel + Telegram femmes + recettes + séances vidéo", justification: "Format long pour intégrer la gestion ramadan", validated: true },
    garantie: { type: "performance", formulation: "Si en 90j tu n'as pas perdu au moins 5 kg, je rembourse 50% et continue gratuitement" },
    urgence: { type: "fenetre_temporelle", justification: "Cohortes calées pré-ramadan + post-ramadan" },
    prix: { montant: "2900", levier_faible: "effort" },
    prix_score_global: 77,
  },
  ladder: {
    freemium: { id: "free_quiz_metabolisme", name: "Quiz « Ton type métabolique de maman »", price: "0€", format: "Quiz 10 questions · 5 min · type + 3 erreurs à éviter emailés", rationale: "Reframing : « ce qui n'a pas marché ce n'est pas toi, c'est la méthode incompatible »." },
    low: { id: "low_ramadan_kit", name: "30 recettes ramadan sans reprise", price: "19€", format: "PDF 60 pages · 30 recettes iftar + sahour · plan semaine · liste courses · accès à vie", rationale: "Résout l'objection N°1 (peur du rebond ramadan). 19€ = budget courses 1 repas." },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_fit_6m", name: "AL BARAKA FIT · 6 mois", price: "2 900€", format: "6 mois · 1 call/mois + audit nutritionnel + Telegram + recettes + séances vidéo", rationale: "Sommet : transformation durable + gestion ramadan + call individuel mensuel." },
  },
  bridges: {
    free_to_low: "Fin du quiz, en pré-ramadan (jan-fev) : « Ton type est X — voici les 30 recettes ramadan sans rebond adaptées à ton type, 19€ pendant 48h ». 35% conversion (cible chaude, peur du rebond ramadan).",
    free_to_mid: "", free_to_high: "", low_to_mid: "",
    low_to_high: "Email post-ramadan (juin-sept) après les acheteuses du PDF ramadan : « Tu as tenu pendant le ramadan — pour transformer ça en 6 mois de transformation durable avec call individuel mensuel + audit nutritionnel, j'ouvre AL BARAKA FIT 6 mois à 2 900€ ». Conversion LT → HT ~6% (les acheteuses ramadan sont qualifiées).",
    mid_to_high: "",
  },
  entry: {
    strategy: "ht_lt",
    rationale: "J'ai 18 transformations documentées avec photos avant/après, mon offre HT tourne. Mon avantage temps fort c'est le ramadan — pendant les 6 semaines qui précèdent, le PDF recettes se télécharge 3× plus que d'habitude. C'est un tripwire saisonnier naturel : je le pousse en jan-février, j'engrange 200-300 acheteuses ramadan kit, et ces 300 personnes deviennent mes prospects HT chauds en septembre quand elles veulent prolonger la dynamique post-ramadan. C'est un cycle annuel pas un funnel continu — mais ça multiplie mon CAC par 3 et ça rentre dans une logique de saisonnalité que ma cible vit déjà. Indicateur de bascule : si après 2 cycles ramadan je vois plus de 30% des LT convertir en HT, je tente une cohorte MT à 397€ en hiver pour les indécises.",
    score: 89,
    feedback: "✓ Stratégie cohérente avec la temporalité de ta niche. Tu as identifié un cycle saisonnier que la plupart des coachs ignorent (le ramadan comme catalyseur d'achat). Le LT n'est pas un canal continu mais un évènement annuel qui nourrit le HT en septembre. Pense à automatiser la séquence post-LT pour ne pas perdre les acheteuses entre juin et août.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "4 ventes HT/mois à 2 900€ = ~11 600€/mois bruts (avec saisonnalité forte septembre-novembre)",
    lt_breakeven_check: "LT 19€ avec CAC ads ~7€ en pré-ramadan = 12€ marge brute. 200-300 ventes × 12€ = 2 400-3 600€ qui couvrent les ads + reste positif. Largement profitable.",
  },
};

// ── 9 · Mehdi · Reprise sport hommes 40+ (bon cas ht_only conservateur) ──
const MEHDI_REPRISE_SPORT_PATCH: Partial<M4State> = {
  current_step: "vue_ensemble", market_type: "b2c_transfo",
  m1_data: {
    source: "demo_sante_reprise_sport_hommes",
    sous_niche_2: {
      phrase: "Hommes musulmans 38-50 ans cadres pères de famille qui veulent reprendre le sport dans un cadre compatible 5 prières + travail",
      phrase_finale: "Hommes musulmans 38-50 ans cadres pères de famille qui veulent reprendre le sport dans un cadre compatible 5 prières + travail",
      cible: "Cadres actifs en couple, 2-5 enfants, sédentaires 5-10 ans",
      douleur: "Voient leur corps changer, peur de la déchéance",
      methode: "REPRISE AL BARAKA — protocole 6 mois homme",
    },
    avatar: { socio: { nom: "Mehdi", age: "42 ans", situation: "Ingénieur informatique, marié, 4 enfants 6-9-12-14, 4 800€/mois", lieu: "Région nantaise" } },
    marche: { id: "sante", label: "🌱 Santé" },
  },
  m2_data: {
    source: "module_2_psychologie", version: "demo_v1",
    data: { step8: {
      positionnement: "Le père qui prend soin de son corps comme amânah, sans devenir égocentrique",
      hook_principal: "Retrouver sa forme physique d'avant en 6 mois, sans sacrifier ses 5 prières ni le temps famille",
      levier_secondaire: "preuve",
      biais_killer: "abonnement salle inutilisé (engagement échec)",
      phase_strategy: "phase 2 — payé 3 ans d'abonnement salle inutilisé, sait qu'il a besoin d'un cadre + accountability",
    } },
  },
  m3_data: {
    source: "module_3_anatomie", complete: true, market_type: "b2c_transfo",
    promesse: "Retrouver ta forme physique de tes 30 ans en 6 mois, sport compatible 5 prières et planning cadre actif",
    mecanisme: { nom: "REPRISE AL BARAKA — protocole 6 mois homme", etapes: ["Audit santé initial", "Plan progressif compatible planning cadre", "Intégration 5 prières + travail", "Pérennisation post-6 mois"] },
    vehicule: { format: "6 mois · 1 call/mois + plan d'entraînement progressif + Telegram frères + audit santé", justification: "Format long pour pérenniser + intégrer hajj", validated: true },
    garantie: { type: "remboursement", formulation: "Si tu n'as pas perdu au moins 8 kg de gras en 90 jours, je rembourse 50%" },
    urgence: { type: "cohorte_limitee", justification: "Suivi individuel mensuel limité" },
    prix: { montant: "2700", levier_faible: "delai" },
    prix_score_global: 75,
  },
  ladder: {
    freemium: { id: "free_audit_homme", name: "Audit forme « Où en es-tu vraiment à 40 ans ? »", price: "0€", format: "Formulaire détaillé + retour vidéo personnalisé 12 min sous 48h", rationale: "Diagnostic clair et rassurant + 3 actions immédiates sans engagement." },
    low: { id: "", name: "", price: "", format: "", rationale: "" },
    mid: { id: "", name: "", price: "", format: "", rationale: "" },
    high: { id: "high_reprise_6m", name: "REPRISE AL BARAKA · 6 mois", price: "2 700€", format: "6 mois · 1 call/mois + plan progressif + Telegram frères + audit santé", rationale: "Sommet : transformation durable + gestion ramadan + préparation hajj + audit santé." },
  },
  bridges: {
    free_to_low: "", free_to_mid: "",
    free_to_high: "Après l'audit gratuit (vidéo personnalisée), invitation au webinaire mensuel 60 min « Comment j'ai couru un marathon à 42 ans » suivi d'un call discovery 30 min. Funnel court : audit → webinaire → call → HT. Pas de tripwire à ce stade (cible 40 ans cadre paie cher quand elle est convaincue, pas en testing). Conversion audit → webinaire ~25%, webinaire → call ~20%, call → HT ~30%.",
    low_to_mid: "", low_to_high: "", mid_to_high: "",
  },
  entry: {
    strategy: "ht_only",
    rationale: "J'ai 14 frères accompagnés au bout, mais seulement 6 témoignages photo/vidéo solides. Mon angle marketing M3 est preuve sociale — donc mon vrai bottleneck c'est la matière de preuve, pas le volume de leads. À ce stade un tripwire « 4 séances à 27€ » me ferait probablement beaucoup d'acheteurs (la cible 40 ans est sensible au quick-win) mais ces acheteurs convertiraient peu en HT et me distrairaient du travail d'aller chercher les 14 témoignages manquants. Je préfère rester focus HT 6-9 mois de plus pour atteindre 20+ témoignages dont 5 vidéo (= contenu marketing pour 12 mois). Indicateur de bascule : 20 témoignages dont 5 vidéo, ET 100 leads/mois minimum sur l'audit gratuit, ALORS je teste un LT « 4 séances ».",
    score: 85,
    feedback: "✓ Stratégie cohérente et patiente. Tu as bien identifié que ton angle (preuve) commande de prioriser la matière de témoignages, pas le volume. La résistance au tripwire facile à ce stade est exactement la discipline qui distingue les coachs qui scalent à terme de ceux qui se dispersent à 6 mois. L'indicateur de bascule est triple (témoignages + vidéo + volume audit) — peut-être un peu strict, mais mieux trop patient que trop tôt.",
    ai_mode: "local", attempts: 1, forced: false,
    ht_monthly_target: "3 ventes HT/mois à 2 700€ = 8 100€/mois bruts",
    lt_breakeven_check: "Non applicable à ce stade — pas de LT.",
  },
};

// ── Liste finale ──────────────────────────────────────────────────────────
export const M4_DEMO_CASES: M4DemoCase[] = [
  // ARGENT
  { key: "argent_affiliation", segment: "argent", emoji: "💼", title: "Karim · salarié → affilié halal",
    summary: "Cadre 31 ans · CDI 2 200€/mois · vise 3 000€/mois d'affiliation halal (ht_lt validé)",
    is_anti_pattern: false, ready: true, patch: KARIM_AFFILIATION_PATCH },
  { key: "argent_setting_closing", segment: "argent", emoji: "⚠", title: "Younes · setter — ANTI-PATTERN full trop tôt",
    summary: "Livreur 24 ans · 3 HT signés · choisit full ladder → IA pousse back (score 54)",
    is_anti_pattern: true, ready: true, patch: YOUNES_SETTER_PATCH },
  { key: "argent_smma_etudiants", segment: "argent", emoji: "🎯", title: "Imen · étudiante → agence SMMA halal",
    summary: "Étudiante 21 ans · bourse 350€/mois · 8 transformations + 5 témoignages (ht_lt score 87)",
    is_anti_pattern: false, ready: true, patch: IMEN_SMMA_PATCH },
  { key: "argent_immo_sans_riba", segment: "argent", emoji: "🏠", title: "Mounia & Anas · couple → RP cash sans riba",
    summary: "Couple 4 800€/mois · 15 couples accompagnés en 3 ans · analyse CAC/marge (ht_lt score 92)",
    is_anti_pattern: false, ready: true, patch: MOUNIA_ANAS_IMMO_PATCH },

  // RELATIONS
  { key: "relations_mariage_halal", segment: "relations", emoji: "💍", title: "Khadija · sœur célibataire → mariage halal",
    summary: "Prof 28 ans · 4 ruptures fiançailles · 6 mariages confirmés (ht_only par cohérence preuve · score 86)",
    is_anti_pattern: false, ready: true, patch: KHADIJA_MARIAGE_PATCH },
  { key: "relations_couple_post_bebe", segment: "relations", emoji: "👨‍👩‍👧", title: "Aïcha & Tarek · couple en érosion post-bébé",
    summary: "Couple 34 & 37 · 3 enfants · cible ultra-prudente → ht_only par sensibilité (score 84)",
    is_anti_pattern: false, ready: true, patch: AICHA_TAREK_COUPLE_PATCH },
  { key: "relations_education_positive", segment: "relations", emoji: "🤱", title: "Najet · maman au foyer → mère sereine",
    summary: "4 enfants · veto conjugal sur achats >50€ → LT 17€ contourne (ht_lt insight conjugal · score 91)",
    is_anti_pattern: false, ready: true, patch: NAJET_EDUCATION_PATCH },

  // SANTÉ
  { key: "sante_perte_poids_mamans", segment: "sante", emoji: "🌿", title: "Salima · maman → perte de poids halal",
    summary: "Maman 37 ans · 15 kg à perdre · cycle saisonnier ramadan → LT 19€ pré-ramadan (ht_lt score 89)",
    is_anti_pattern: false, ready: true, patch: SALIMA_PERTE_POIDS_PATCH },
  { key: "sante_reprise_sport_hommes", segment: "sante", emoji: "🏃", title: "Mehdi · cadre 40 ans → reprise sportive",
    summary: "Cadre 42 ans · 4 enfants · 14 frères accompagnés mais 6 témoignages → ht_only patient (score 85)",
    is_anti_pattern: false, ready: true, patch: MEHDI_REPRISE_SPORT_PATCH },
  { key: "sante_anxiete_etudiants", segment: "sante", emoji: "⚠", title: "Lina · psy — ANTI-PATTERN full fragile",
    summary: "Psychologue 22 ans · 9 étudiantes accompagnées · full ladder fragile → IA refuse (score 52)",
    is_anti_pattern: true, ready: true, patch: LINA_ANXIETE_PATCH },
];
