/**
 * M11 — validations heuristiques + analyses de cohérence (port verbatim Sidali v1.5.0).
 * Aucune IA : tout est synchrone/local. Fonctions pures prenant (data, m6Data).
 */
import {
  type M11Data, type Module, type Lecon, type Tier, type BloomKey, type M11Step,
  GATE_ITEMS, BLOOM_LEVELS, BLOOM_KEYS_BY_TIER, BLOOM_RECOMMENDED_BY_TIER, BLOOM_ORDINALS,
  ACCOUNTABILITY_VALIDATION, ACCOUNTABILITY_FREQUENCE, ACCOUNTABILITY_ENGAGEMENT, ACCOUNTABILITY_PROGRESSION,
  MIN_OBSTACLES, MIN_MODULES_FINAL, MAX_MODULES, MIN_LECONS, freshModule,
} from "./types";

export interface SoftWarning { severity: "soft"; message: string; }
export interface CoherenceWarning { severity: "warning" | "info"; title: string; detail: string; }
export type CoherenceScore = "ok" | "info" | "warning" | "unknown";
export interface CoherenceResult { warnings: CoherenceWarning[]; score: CoherenceScore; }
export interface AccountabilityResult extends CoherenceResult { force: number; }

// ─── Validations syntaxiques douces ───────────────────────────────────
export function detectActionVerb(text: string): boolean {
  if (!text) return false;
  const t = String(text).trim();
  if (t.length < 3) return false;
  const cleaned = t.replace(/^(te |t')/i, "");
  const firstWord = (cleaned.match(/^[\wÀ-ÿ'-]+/) || [""])[0];
  if (firstWord.length < 3) return false;
  const lower = firstWord.toLowerCase();
  if (/^[a-zà-ÿ]+(er|ir|re|oir)$/i.test(lower)) return true;
  const irreguliers = ["être", "avoir", "faire", "voir", "savoir", "pouvoir", "vouloir", "devoir", "aller"];
  if (irreguliers.indexOf(lower) !== -1) return true;
  return false;
}

export function validateModuleName(nom: string): SoftWarning | null {
  if (!nom || !nom.trim()) return null;
  if (!detectActionVerb(nom)) {
    return { severity: "soft", message: "Ce nom ne commence pas par un verbe d'action. Reformule en « Trouver… », « Maîtriser… », « Architecturer… » — ça force un résultat concret." };
  }
  return null;
}

export function validateObstacle(obs: string): SoftWarning | null {
  if (!obs || !obs.trim()) return null;
  const t = obs.trim();
  if (/^(Ne (sait|maîtrise|connaît|comprend|peut|parvient|arrive|réussit|distingue|identifie|possède|maitrise|connait)|N'a pas|Manque de) /i.test(t)) return null;
  return { severity: "soft", message: "Reformule en commençant par « Ne sait pas… », « Ne maîtrise pas… », « N'a pas… » ou « Manque de… » — ça force à formuler un déficit concret qui devient un module." };
}

export function validateObjectifMesurable(obj: string): SoftWarning | null {
  if (!obj || !obj.trim()) return null;
  if (obj.trim().length < 20) return null;
  if (!/\d/.test(obj)) {
    return { severity: "soft", message: "Ton objectif n'a pas de critère chiffré (seuil, fréquence, durée, note). Ajoute un nombre concret : « ≥ 8/10 », « 30 appels/mois », « en moins de 90 min »…" };
  }
  return null;
}

export function countObstaclesMalFormules(list: string[]): number {
  return (list || []).filter((o) => o && o.trim().length >= 5 && validateObstacle(o)).length;
}

// ─── Sélecteurs / complétude ──────────────────────────────────────────
export function getBloomOptionsForTier(tier: string): BloomKey[] {
  if (!tier || !BLOOM_KEYS_BY_TIER[tier as Tier]) return Object.keys(BLOOM_LEVELS) as BloomKey[];
  return BLOOM_KEYS_BY_TIER[tier as Tier];
}

export function isModuleFicheComplete(m: Module): boolean {
  if (!m) return false;
  if (!(m.nom || "").trim()) return false;
  if (!(m.objectif_mesurable || "").trim() || (m.objectif_mesurable || "").trim().length < 20) return false;
  if (!m.niveau_bloom) return false;
  if (!(m.duree_video || "").toString().trim()) return false;
  if (!m.type_exercice) return false;
  let bonusCount = 0;
  if ((m.livrable_attendu || "").trim().length >= 10) bonusCount++;
  if ((m.mise_situation || "").trim().length >= 10) bonusCount++;
  if ((m.auto_evaluation || "").trim().length >= 10) bonusCount++;
  if (bonusCount < 2) return false;
  const lecons = Array.isArray(m.lecons) ? m.lecons : [];
  const leconsValides = lecons.filter((l) => (l.titre || "").trim().length >= 3 && (l.angle || "").trim().length >= 10);
  if (leconsValides.length < MIN_LECONS) return false;
  const leconsAvecRecall = leconsValides.filter((l) => (l.active_recall || "").trim().length >= 10);
  if (leconsAvecRecall.length < 2) return false;
  return true;
}

// ─── Gate / gating cumulatif ──────────────────────────────────────────
export function computeGateScore(data: M11Data): number {
  const g = data.gate || ({} as any);
  let n = 0;
  GATE_ITEMS.forEach((it) => { if ((g as any)[it.id]) n++; });
  return n;
}
export function canEnterPointsStep(data: M11Data): boolean {
  const score = computeGateScore(data);
  const g = data.gate || ({} as any);
  if (score >= 8) return true;
  if (score >= 6 && g.override_warning) return true;
  return false;
}
export function canEnterObstaclesBrutStep(data: M11Data): boolean {
  if (!canEnterPointsStep(data)) return false;
  const a = (data.point_a || "").trim();
  const b = (data.point_b || "").trim();
  return a.length >= 15 && b.length >= 15;
}
export function canEnterOrdresStep(data: M11Data): boolean {
  if (!canEnterObstaclesBrutStep(data)) return false;
  const obs = data.obstacles_brut || [];
  return obs.filter((o) => (o || "").trim().length >= 5).length >= MIN_OBSTACLES;
}
export function canEnterMappingStep(data: M11Data): boolean {
  if (!canEnterOrdresStep(data)) return false;
  const ord = data.obstacles_ordonnes || [];
  return ord.length >= MIN_MODULES_FINAL && ord.length <= MAX_MODULES;
}
export function canEnterFichesStep(data: M11Data): boolean {
  if (!canEnterMappingStep(data)) return false;
  const mods = data.modules || [];
  if (mods.length < 1 || mods.length > MAX_MODULES) return false;
  return mods.every((m) => (m.nom || "").trim().length >= 2);
}
export function canEnterLockStep(data: M11Data): boolean {
  if (!canEnterFichesStep(data)) return false;
  const mods = data.modules || [];
  return mods.every((m) => isModuleFicheComplete(m));
}
export function isAccountabilityComplete(data: M11Data): boolean {
  const a = (data && data.accountability) || ({} as any);
  return !!(a.validation_par_defaut && a.frequence_contact_humain && a.engagement_initial && a.progression_modules);
}
export function canSignLock(data: M11Data): boolean { return canEnterLockStep(data) && isAccountabilityComplete(data); }

export function computeAccountabilityForce(data: M11Data): number {
  const a = (data && data.accountability) || ({} as any);
  let total = 0;
  if (a.validation_par_defaut && ACCOUNTABILITY_VALIDATION[a.validation_par_defaut as keyof typeof ACCOUNTABILITY_VALIDATION]) total += ACCOUNTABILITY_VALIDATION[a.validation_par_defaut as keyof typeof ACCOUNTABILITY_VALIDATION].force;
  if (a.frequence_contact_humain && ACCOUNTABILITY_FREQUENCE[a.frequence_contact_humain as keyof typeof ACCOUNTABILITY_FREQUENCE]) total += ACCOUNTABILITY_FREQUENCE[a.frequence_contact_humain as keyof typeof ACCOUNTABILITY_FREQUENCE].force;
  if (a.engagement_initial && ACCOUNTABILITY_ENGAGEMENT[a.engagement_initial as keyof typeof ACCOUNTABILITY_ENGAGEMENT]) total += ACCOUNTABILITY_ENGAGEMENT[a.engagement_initial as keyof typeof ACCOUNTABILITY_ENGAGEMENT].force;
  if (a.progression_modules && ACCOUNTABILITY_PROGRESSION[a.progression_modules as keyof typeof ACCOUNTABILITY_PROGRESSION]) total += ACCOUNTABILITY_PROGRESSION[a.progression_modules as keyof typeof ACCOUNTABILITY_PROGRESSION].force;
  return total;
}

// ─── missingFieldsLabel (par étape) ───────────────────────────────────
export function missingFieldsLabel(current: M11Step, data: M11Data): string {
  const g = data.gate || ({} as any);
  const score = computeGateScore(data);
  const missing: string[] = [];
  if (current === "gate_transition") {
    if (score < 6) missing.push("au moins 6 cases cochées sur 8");
    else if (score < 8 && !g.override_warning) missing.push("cocher « je continue malgré tout » pour avancer avec " + score + "/8");
  } else if (current === "points_ab") {
    if ((data.point_a || "").trim().length < 15) missing.push("le Point A décrit (15 caractères min)");
    if ((data.point_b || "").trim().length < 15) missing.push("le Point B décrit (15 caractères min)");
  } else if (current === "obstacles_brut") {
    const nonVides = (data.obstacles_brut || []).filter((o) => (o || "").trim().length >= 5);
    if (nonVides.length < MIN_OBSTACLES) missing.push("au moins " + MIN_OBSTACLES + " obstacles listés (tu en as " + nonVides.length + ")");
  } else if (current === "obstacles_ordres") {
    const ord = data.obstacles_ordonnes || [];
    if (ord.length < MIN_MODULES_FINAL) missing.push("au moins " + MIN_MODULES_FINAL + " obstacles ordonnés (après filtrage et regroupement)");
    if (ord.length > MAX_MODULES) missing.push("au plus " + MAX_MODULES + " obstacles retenus (tu en as " + ord.length + " — supprime ou regroupe)");
  } else if (current === "modules_mapping") {
    const sansNom = (data.modules || []).filter((m) => !(m.nom || "").trim()).length;
    if (sansNom > 0) missing.push("nommer les " + sansNom + " module(s) sans nom");
  } else if (current === "module_fiches") {
    const incomplets = (data.modules || []).filter((m) => !isModuleFicheComplete(m));
    if (incomplets.length > 0) missing.push("compléter la fiche de " + incomplets.length + " module(s) (objectif chiffré, niveau Bloom, durée, type d'exercice, au moins " + MIN_LECONS + " leçons avec titre + angle, et 2 leçons avec active recall)");
  }
  if (missing.length === 0) return "";
  if (missing.length === 1) return missing[0];
  if (missing.length === 2) return missing[0] + " et " + missing[1];
  return missing.slice(0, -1).join(", ") + " et " + missing[missing.length - 1];
}

// ─── Coût accountability (coût × prix × durée) ────────────────────────
export interface CostEstimate {
  hours_per_program: number; cost_per_program: number; revenue_per_program: number;
  ratio: number | null; duree_mois: number; overrides_modules_used: number;
}
export function estimateAccountabilityCostPerStudent(data: M11Data, m6Data: any): CostEstimate | null {
  const a = (data && data.accountability) || ({} as any);
  const m6 = m6Data || {};
  const prix = parseInt(m6.prix_ht, 10) || 0;
  if (!isAccountabilityComplete(data)) return null;
  const dureeMois = parseInt(data.duree_programme_mois, 10) || 12;
  const facteurDuree = dureeMois / 12;
  const hoursFromFreq: Record<string, number> = { aucun: 0, global: 1, mensuel: 12, hebdo: 50, quotidien: 250 };
  let heuresContact = (hoursFromFreq[a.frequence_contact_humain] || 0) * facteurDuree;
  if (a.progression_modules === "cohort" && heuresContact > 0) heuresContact = heuresContact / 5;
  const validationCostsPerModule: Record<string, number> = { coach_sync: 1.0, coach_async: 0.5, pair: 0.1, auto: 0 };
  const mods = (data && data.modules) || [];
  let heuresValidation = 0;
  mods.forEach((m) => {
    const mode = m.mode_validation || a.validation_par_defaut || "";
    heuresValidation += validationCostsPerModule[mode] || 0;
  });
  const heuresTotales = heuresContact + heuresValidation;
  const tauxHoraire = 50;
  const cost_per_program = heuresTotales * tauxHoraire;
  const revenue_per_program = prix;
  const overridesUsed = mods.filter((m) => m.mode_validation).length;
  return {
    hours_per_program: heuresTotales, cost_per_program, revenue_per_program,
    ratio: revenue_per_program ? cost_per_program / revenue_per_program : null,
    duree_mois: dureeMois, overrides_modules_used: overridesUsed,
  };
}

// ─── Cohérence Bloom (6 checks) ───────────────────────────────────────
export function analyzeBloomCoherence(data: M11Data): CoherenceResult {
  const tier = data.tier_bloom_target;
  const mods = data.modules || [];
  const warnings: CoherenceWarning[] = [];
  if (!tier || mods.length === 0) return { warnings, score: "unknown" };
  const niveauxOrdinaux = mods.map((m) => BLOOM_ORDINALS[m.niveau_bloom as BloomKey] || 0).filter((n) => n > 0);

  if (tier === "ht" && !mods.some((m) => m.niveau_bloom === "creer")) {
    warnings.push({ severity: "warning", title: "Aucun module ne pousse jusqu'à « Créer »", detail: "Tu vends à un prix high-ticket (≥ 2 000 €), mais aucun module n'amène l'élève à produire un livrable original (niveau Créer). Mécaniquement, ton programme est un mid-ticket déguisé. Identifie au moins un module — souvent le dernier — qui demande à l'élève de produire une œuvre originale." });
  }
  if (tier === "mt" && niveauxOrdinaux.length > 0 && niveauxOrdinaux.every((n) => n <= 3)) {
    warnings.push({ severity: "warning", title: "Tes modules plafonnent à « Appliquer »", detail: "Sur du mid-ticket (500-2 000 €), vise au moins un module au niveau Évaluer — l'élève doit savoir juger ses propres résultats avec une grille. Sinon tu vends une autoformation premium, pas un programme transformateur." });
  }
  if (tier === "lt" && niveauxOrdinaux.some((n) => n >= 5)) {
    warnings.push({ severity: "info", title: "Tu vises haut pour un low-ticket", detail: "Un ou plusieurs modules sont à Évaluer ou Créer. Sur low-ticket (< 500 €), c'est ambitieux — l'élève n'aura ni le suivi ni la profondeur d'accompagnement pour y arriver seul. Soit tu rabaisses à Appliquer, soit tu remontes le prix." });
  }
  if (niveauxOrdinaux.length >= 3) {
    const min = Math.min.apply(null, niveauxOrdinaux);
    const max = Math.max.apply(null, niveauxOrdinaux);
    const recoOrdinal = BLOOM_ORDINALS[BLOOM_RECOMMENDED_BY_TIER[tier as Tier]] || 0;
    const tousAuMax = niveauxOrdinaux.every((n) => n >= recoOrdinal);
    if (max - min === 0 && !tousAuMax) {
      warnings.push({ severity: "info", title: "Progression Bloom plate", detail: "Tous tes modules sont au même niveau Bloom. Un programme cohérent monte généralement en exigence : « Appliquer » sur les premiers modules, « Évaluer » ou « Créer » sur les derniers. Vérifie que cette uniformité est voulue." });
    }
  }
  if (niveauxOrdinaux.length >= 3) {
    const premier = niveauxOrdinaux[0];
    const dernier = niveauxOrdinaux[niveauxOrdinaux.length - 1];
    if (premier > dernier + 1) {
      warnings.push({ severity: "warning", title: "Progression Bloom décroissante", detail: "Tes premiers modules sont plus exigeants que les derniers. C'est contre-intuitif pour l'élève : il s'attend à monter en compétence, pas à redescendre. Réorganise pour que la difficulté progresse." });
    }
  }
  const sousCalibres: { idx: number; nom: string; niveau: string }[] = [];
  mods.forEach((m, i) => {
    const ord = BLOOM_ORDINALS[m.niveau_bloom as BloomKey] || 0;
    if (ord === 0) return;
    const niveau = BLOOM_LEVELS[m.niveau_bloom as BloomKey] ? BLOOM_LEVELS[m.niveau_bloom as BloomKey].label : m.niveau_bloom;
    if (tier === "ht" && ord <= 2) sousCalibres.push({ idx: i + 1, nom: m.nom || "Module " + (i + 1), niveau });
    else if (tier === "mt" && ord <= 1) sousCalibres.push({ idx: i + 1, nom: m.nom || "Module " + (i + 1), niveau });
  });
  if (sousCalibres.length > 0) {
    const liste = sousCalibres.map((s) => "« " + s.nom + " » (" + s.niveau + ")").join(", ");
    warnings.push({
      severity: "warning",
      title: sousCalibres.length === 1 ? "Un module sous-calibré pour ton tier" : sousCalibres.length + " modules sous-calibrés pour ton tier",
      detail: "Sur " + (tier === "ht" ? "high-ticket (≥ 2 000 €)" : "mid-ticket (500-2 000 €)") + ", les modules ne devraient pas plafonner à « Se souvenir » ou « Comprendre » — ce sont des niveaux d'autoformation, pas de programme transformateur. À revoir : " + liste + ".",
    });
  }

  let score: CoherenceScore = "ok";
  if (warnings.some((w) => w.severity === "warning")) score = "warning";
  else if (warnings.some((w) => w.severity === "info")) score = "info";
  return { warnings, score };
}

// ─── Cohérence accountability (5 checks) ──────────────────────────────
export function analyzeAccountability(data: M11Data, m6Data: any): AccountabilityResult {
  const tier = data.tier_bloom_target;
  const a = (data && data.accountability) || ({} as any);
  const warnings: CoherenceWarning[] = [];
  if (!isAccountabilityComplete(data)) return { warnings: [], score: "unknown", force: 0 };
  const force = computeAccountabilityForce(data);

  if (tier === "ht" && force <= 3) {
    warnings.push({ severity: "warning", title: "Accountability trop faible pour un high-ticket", detail: "Sur un programme à ≥ 2 000 €, ton score d'accountability est de " + force + "/16. Statistiquement, les programmes HT sans accountability structurée plafonnent à 20-30% de complétion — autrement dit, 70-80% de tes clients n'auront jamais le résultat promis et ne deviendront pas tes témoignages. Ajoute au moins un point de contact humain régulier ou un gate par livrable validé." });
  }
  if (tier === "mt" && a.frequence_contact_humain === "aucun") {
    warnings.push({ severity: "info", title: "Aucun contact humain sur un mid-ticket", detail: "Sur 500-2 000 €, envisage au moins un group call mensuel ou un canal Slack/Discord avec présence coach. Le DIY pur fonctionne sous 500 €, au-dessus c'est risqué pour la complétion." });
  }
  if (a.progression_modules === "cohort" && a.frequence_contact_humain === "aucun") {
    warnings.push({ severity: "warning", title: "Cohort sans contact humain", detail: "Une cohort synchronisée sans sessions live perd son intérêt principal — la dynamique de groupe et l'effet d'entraînement. Ajoute au moins un group call hebdo, ou repasse en drip/gate-livrable." });
  }
  if (a.validation_par_defaut === "auto" && a.frequence_contact_humain === "aucun" && a.engagement_initial === "aucun" && a.progression_modules === "tout_ouvert") {
    warnings.push({ severity: "warning", title: "Aucun mécanisme d'accountability", detail: "Ton programme n'a aucun garde-fou pour que l'élève finisse : pas de validation externe, pas de contact humain, pas d'engagement, tout ouvert. C'est le combo qui produit les bibliothèques de cours non-consommés. Ajoute au moins UN mécanisme parmi les 4." });
  }
  const cost = estimateAccountabilityCostPerStudent(data, m6Data);
  if (!cost) {
    // accountability incomplète, déjà signalé ailleurs
  } else if (cost.revenue_per_program <= 0) {
    warnings.push({ severity: "info", title: "Renseigne ton prix M6 pour activer le check de viabilité", detail: "Sans prix défini dans M6 PRICING, l'outil ne peut pas estimer si ton accountability est financièrement viable. Avec ton coût estimé actuel de " + Math.round(cost.cost_per_program) + " €/élève sur " + cost.duree_mois + " mois, tu sauras si ton ratio reste sous 40% une fois M6 complété." });
  } else {
    const ratio = cost.ratio || 0;
    if (ratio >= 1) {
      warnings.push({ severity: "warning", title: "Accountability non viable financièrement", detail: "Le coût estimé de ton accountability (" + Math.round(cost.cost_per_program) + " €/élève sur " + cost.duree_mois + " mois) dépasse le revenu par élève (" + Math.round(cost.revenue_per_program) + " €). Mécaniquement impossible à délivrer. Allège l'accountability (mensuel au lieu de hebdo, pair review au lieu de coach sync) ou augmente le prix." });
    } else if (ratio >= 0.4) {
      warnings.push({ severity: "info", title: "Accountability gourmande en marge", detail: "Le coût estimé de ton accountability mange " + Math.round(ratio * 100) + "% du revenu par élève (" + Math.round(cost.cost_per_program) + " € sur " + Math.round(cost.revenue_per_program) + " €, programme de " + cost.duree_mois + " mois). Viable mais marge serrée — il te restera " + Math.round((1 - ratio) * 100) + "% pour le contenu, la plateforme, l'acquisition, ta rémunération. M18 VALUE LADDER affinera ce calcul." });
    }
  }

  let score: CoherenceScore = "ok";
  if (warnings.some((w) => w.severity === "warning")) score = "warning";
  else if (warnings.some((w) => w.severity === "info")) score = "info";
  return { warnings, score, force };
}

// ─── Générateur de leçons par défaut (fallback démos) ─────────────────
export function generateDefaultLeconsForModule(m: Module, modIdx: number): Lecon[] {
  const seed = (m.id || "m" + modIdx).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const bloom = m.niveau_bloom || "appliquer";
  const dureeMod = parseInt(m.duree_video, 10) || 45;
  const base = "_" + modIdx + "_" + seed.toString(36);
  let templates: { titre: string; angle: string; duree: number; recall: string }[];
  if (bloom === "creer") {
    templates = [
      { titre: "Cadre conceptuel et inspirations", angle: "Présentation du concept central et de 3 exemples contrastés (réussite, échec, cas limite) pour calibrer ton jugement avant de produire.", duree: Math.round(dureeMod * 0.20), recall: "Quels sont les 3 critères qui distinguent un livrable réussi d'un livrable raté ?" },
      { titre: "Démonstration complète sur un cas type", angle: "Reprise pas-à-pas de la méthode sur un cas réel anonymisé. Pièges classiques montrés en passant. Outils et templates fournis ici.", duree: Math.round(dureeMod * 0.30), recall: "Identifie l'étape qui te paraît la plus risquée pour ton propre cas." },
      { titre: "Atelier de production guidé", angle: "Tu construis ton livrable en suivant la trame. Checkpoints intermédiaires pour t'auto-corriger avant d'aller trop loin.", duree: Math.round(dureeMod * 0.30), recall: "" },
      { titre: "Critique et itération finale", angle: "Grille de validation complète, procédure de retour coach si tu en as accès, et itération sur le livrable jusqu'au seuil.", duree: Math.round(dureeMod * 0.20), recall: "Si ton résultat est en dessous du seuil, quelle est ta prochaine action concrète ?" },
    ];
  } else if (bloom === "evaluer") {
    templates = [
      { titre: "Grille d'analyse · les critères qui comptent", angle: "Décortique 5 cas concrets pour repérer les patterns de succès et d'échec. Tu construis ton propre référentiel de jugement.", duree: Math.round(dureeMod * 0.30), recall: "Note les 3 critères qui te paraissent les plus discriminants à ce stade." },
      { titre: "Méthode et template d'évaluation", angle: "Application de la grille sur ton propre cas, avec exemples annotés. Sortie : une note motivée que tu peux défendre.", duree: Math.round(dureeMod * 0.40), recall: "Auto-évalue ton cas et compare à la grille fournie — où es-tu trop indulgent ou trop sévère ?" },
      { titre: "Itération et seuil de validation", angle: "Ce que tu fais si ton score est sous le seuil : protocole de correction par axe défaillant.", duree: Math.round(dureeMod * 0.30), recall: "" },
    ];
  } else if (bloom === "analyser") {
    templates = [
      { titre: "Décortiquer le mécanisme", angle: "Analyse en profondeur des composants et de leurs interactions. Comment les pièces s'emboîtent et pourquoi cet ordre-là plutôt qu'un autre.", duree: Math.round(dureeMod * 0.35), recall: "Quel composant tu sous-estimais avant ce module ?" },
      { titre: "Études de cas comparées", angle: "Trois cas réels analysés en parallèle pour identifier ce qui varie et ce qui ne varie jamais. Tu construis ton modèle mental.", duree: Math.round(dureeMod * 0.35), recall: "" },
      { titre: "Synthèse et grille de diagnostic", angle: "Outil de diagnostic finalisé que tu pourras réutiliser sur tous tes cas suivants.", duree: Math.round(dureeMod * 0.30), recall: "Applique le diagnostic sur un cas de ton historique." },
    ];
  } else {
    templates = [
      { titre: "Cadre théorique et exemples ancrés", angle: "Concept central expliqué avec 3 exemples concrets contrastés (cas réussi, cas raté, cas limite) pour ancrer la compréhension.", duree: Math.round(dureeMod * 0.25), recall: "Reformule en une phrase ce que ce module va te permettre de faire concrètement." },
      { titre: "Méthode pas à pas avec template", angle: "Démonstration en direct de la méthode complète sur un cas type. Mise à disposition du template à remplir. Démontage des pièges fréquents au passage.", duree: Math.round(dureeMod * 0.45), recall: "Avant de regarder la suite, applique la méthode sur ton propre cas et identifie ce qui te bloque." },
      { titre: "Validation et passage à l'action", angle: "Critères de validation du livrable, grille d'auto-évaluation, et procédure pour itérer si le critère n'est pas atteint au premier essai.", duree: Math.round(dureeMod * 0.30), recall: "" },
    ];
  }
  return templates.map((t, li) => ({
    id: "lec" + base + "_" + (li + 1),
    titre: t.titre, angle: t.angle,
    duree_min: String(t.duree || ""), active_recall: t.recall || "",
  }));
}

// ─── Sync modules ← obstacles ordonnés (préserve le travail) ──────────
export function syncModulesFromObstaclesOrdonnes(data: M11Data): Module[] {
  const ord = data.obstacles_ordonnes || [];
  const existants = data.modules || [];
  if (existants.length === ord.length && ord.length > 0) {
    return existants.map((mm, i) => ({ ...mm, obstacle_origine: ord[i] }));
  }
  const out: Module[] = [];
  const usedIdx = new Set<number>();
  ord.forEach((obs, i) => {
    let foundIdx = existants.findIndex((x, k) => !usedIdx.has(k) && x.obstacle_origine === obs);
    if (foundIdx === -1 && existants[i] && !usedIdx.has(i)) foundIdx = i;
    if (foundIdx !== -1) { usedIdx.add(foundIdx); out.push({ ...existants[foundIdx], obstacle_origine: obs }); }
    else { const nv = freshModule(); nv.id = "mod_" + Date.now().toString(36) + "_" + i; nv.obstacle_origine = obs; out.push(nv); }
  });
  return out;
}
