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
  { key: "relations_couple_post_bebe", segment: "relations", emoji: "👶", title: "Couple post-bébé (ht_only)",
    summary: "Couples en burnout post-naissance · ht_only par sensibilité (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "relations_education_positive", segment: "relations", emoji: "👨‍👩‍👧", title: "Éducation positive (ht_lt insight)",
    summary: "Mamans éducation cohérente · ht_lt avec insight (à transcrire)",
    is_anti_pattern: false, ready: false },

  // SANTÉ
  { key: "sante_perte_poids_mamans", segment: "sante", emoji: "🤰", title: "Perte de poids mamans (ht_lt saisonnier)",
    summary: "Mamans post-grossesse · ht_lt saisonnier (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "sante_reprise_sport_hommes", segment: "sante", emoji: "💪", title: "Reprise sport hommes (ht_only)",
    summary: "Hommes 35-50 sédentaires · ht_only conservateur (à transcrire)",
    is_anti_pattern: false, ready: false },
  { key: "sante_anxiete_etudiants", segment: "sante", emoji: "⚠", title: "Lina · psy — ANTI-PATTERN full fragile",
    summary: "Psychologue 22 ans · 9 étudiantes accompagnées · full ladder fragile → IA refuse",
    is_anti_pattern: true, ready: true, patch: LINA_ANXIETE_PATCH },

  // (10ème case démo à compléter — placeholder)
  { key: "argent_freelance_dev", segment: "argent", emoji: "💻", title: "Freelance dev halal (à transcrire)",
    summary: "Dev musulman qui sort du salariat · stratégie (à transcrire)",
    is_anti_pattern: false, ready: false },
];
