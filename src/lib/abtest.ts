// ─────────────────────────────────────────────────────────────────────────
// A/B testing — attribution des variantes et lecture des résultats.
//
// Ce module contient les quatre décisions qui séparent un vrai outil d'A/B
// testing d'un compteur de clics. Elles sont détaillées à chaque fonction, mais
// en résumé :
//
//   1. L'attribution est DÉTERMINISTE, pas aléatoire.
//   2. Le déséquilibre de répartition est CONTRÔLÉ (SRM).
//   3. Aucun gagnant n'est annoncé sans SIGNIFICATIVITÉ statistique.
//   4. La métrique est choisie AVANT, jamais après.
// ─────────────────────────────────────────────────────────────────────────

// ═══ 1. Attribution ══════════════════════════════════════════════════════

/**
 * Hachage FNV-1a 32 bits. Rapide, stable, sans dépendance.
 *
 * On ne cherche pas une qualité cryptographique : juste une fonction qui
 * disperse uniformément et rend TOUJOURS le même résultat pour la même entrée.
 */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * La variante servie à un visiteur pour un test donné.
 *
 * DÉTERMINISTE, ET C'EST TOUT L'INTÉRÊT. Un `Math.random()` mémorisé dans le
 * navigateur marche… jusqu'à ce que le visiteur vide son stockage, navigue en
 * privé, ou revienne depuis un autre onglet ayant perdu la clé. Il retire alors
 * au sort et peut changer de camp — on compte deux visiteurs là où il y en a un,
 * et on crédite à une variante une conversion que l'autre a amorcée.
 *
 * En hachant `visiteur + test`, le même visiteur retombe indéfiniment sur la
 * même variante, même sans mémoire locale. Et deux tests simultanés répartissent
 * indépendamment, puisque le code du test entre dans le hachage : sans lui, un
 * visiteur toujours dans le premier groupe le serait dans tous les tests à la
 * fois, et les biais se cumuleraient.
 */
export function attribuerVariante(
  visitorId: string,
  testCode: string,
  variants: string[],
  weights: number[],
): string {
  if (variants.length === 0) throw new Error("Aucune variante à répartir");
  if (variants.length !== weights.length) throw new Error("variants et weights de tailles différentes");

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error("Les poids doivent être strictement positifs");

  // 10 000 paliers : suffisant pour des poids au centième de pourcent près.
  const position = hash32(`${visitorId}:${testCode}`) % 10_000;
  const seuil = (position / 10_000) * total;

  let cumul = 0;
  for (let i = 0; i < variants.length; i++) {
    cumul += weights[i];
    if (seuil < cumul) return variants[i];
  }
  return variants[variants.length - 1]; // sécurité contre les arrondis flottants
}

// ═══ 2. Outils statistiques ══════════════════════════════════════════════

/** Fonction de répartition de la loi normale centrée réduite. */
function phi(x: number): number {
  // Approximation d'Abramowitz & Stegun 26.2.17, erreur < 7,5e-8.
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

/** Fonction gamma logarithmique (Lanczos), pour la loi du khi-deux. */
function lnGamma(x: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** Gamma incomplète régularisée P(a,x), par série puis fraction continue. */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 200; n++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Fraction continue pour Q(a,x), puis P = 1 - Q.
  let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

/** p-valeur d'un khi-deux à `df` degrés de liberté. */
export function khiDeuxPValeur(chi2: number, df: number): number {
  if (chi2 <= 0 || df <= 0) return 1;
  return 1 - gammaP(df / 2, chi2 / 2);
}

// ═══ 3. Contrôle de déséquilibre (SRM) ═══════════════════════════════════

export interface ControleRepartition {
  conforme: boolean;
  pValeur: number;
  attendu: number[];
  observe: number[];
}

/**
 * Sample Ratio Mismatch : la répartition observée colle-t-elle aux poids voulus ?
 *
 * POURQUOI C'EST INDISPENSABLE. Un tirage équitable ne donne jamais exactement
 * 50/50 — sur 10 visites, 6/4 est banal et 8/2 arrive. Mais un écart PERSISTANT
 * sur un gros volume n'est pas de la chance : c'est un bug. Redirection qui
 * mange une variante, bot qui tape toujours la même URL, cache qui fige la
 * réponse, variante cassée sur un navigateur.
 *
 * Sans ce contrôle, on interprète tranquillement les résultats d'un test cassé.
 * C'est la première chose que vérifient les outils sérieux, et la plus souvent
 * absente des implémentations maison.
 *
 * Seuil à 0,001 et non 0,05 : on ne veut pas crier au bug à chaque fluctuation.
 */
export function controleRepartition(observe: number[], poids: number[]): ControleRepartition {
  const total = observe.reduce((a, b) => a + b, 0);
  const totalPoids = poids.reduce((a, b) => a + b, 0);
  const attendu = poids.map((p) => (p / totalPoids) * total);

  // En dessous de 5 attendus par case, le khi-deux n'est pas fiable : on
  // s'abstient plutôt que de produire une alerte qui ne veut rien dire.
  if (total === 0 || attendu.some((e) => e < 5)) {
    return { conforme: true, pValeur: 1, attendu, observe };
  }

  const chi2 = observe.reduce((acc, o, i) => acc + (o - attendu[i]) ** 2 / attendu[i], 0);
  const pValeur = khiDeuxPValeur(chi2, observe.length - 1);
  return { conforme: pValeur >= 0.001, pValeur, attendu, observe };
}

// ═══ 4. Comparaison de deux variantes ════════════════════════════════════

export interface Comparaison {
  /** Écart relatif de la variante testée par rapport à la référence, en %. */
  lift: number;
  pValeur: number;
  significatif: boolean;
  /** Intervalle de confiance à 95 % sur la différence de taux, en points. */
  ic95: [number, number];
}

/**
 * Test de proportions à deux échantillons (z-test).
 *
 * `x` = succès, `n` = effectif. Rend la p-valeur bilatérale et l'intervalle de
 * confiance sur la différence — l'intervalle compte autant que la p-valeur :
 * il dit de combien on peut se tromper, là où la p-valeur ne dit que « oui/non ».
 */
export function comparerProportions(
  xRef: number, nRef: number,
  xVar: number, nVar: number,
  seuil = 0.05,
): Comparaison | null {
  if (nRef === 0 || nVar === 0) return null;

  const pRef = xRef / nRef;
  const pVar = xVar / nVar;
  const pool = (xRef + xVar) / (nRef + nVar);
  const se = Math.sqrt(pool * (1 - pool) * (1 / nRef + 1 / nVar));
  if (se === 0) return null;

  const z = (pVar - pRef) / se;
  const pValeur = 2 * (1 - phi(Math.abs(z)));

  // L'intervalle utilise l'erreur type NON poolée : le test suppose l'égalité
  // des taux, l'estimation de l'écart ne le doit pas.
  const seDiff = Math.sqrt((pRef * (1 - pRef)) / nRef + (pVar * (1 - pVar)) / nVar);
  const marge = 1.959964 * seDiff;
  const diff = pVar - pRef;

  return {
    lift: pRef > 0 ? ((pVar - pRef) / pRef) * 100 : 0,
    pValeur,
    significatif: pValeur < seuil,
    ic95: [(diff - marge) * 100, (diff + marge) * 100],
  };
}

// ═══ 5. Lecture d'ensemble ═══════════════════════════════════════════════

/**
 * Une ligne de `ab_test_resultats`, telle que la base la renvoie.
 *
 * `visiteurs` = ceux qui ont VU la variante (page de remerciement).
 * `conversions` = ceux qui ont fait l'action d'après — rejoindre le groupe
 * WhatsApp, ou prendre rendez-vous. C'est le couple qui fait le test.
 *
 * Le taux d'inscription n'y figure pas, et c'est voulu : les deux tunnels
 * partagent la même landing, donc les deux groupes s'inscrivent au même rythme
 * par construction. En mesurer l'écart ne mesurerait que du bruit.
 */
export interface ResultatBrut {
  variant: string;
  poids: number;
  visiteurs: number;
  conversions: number;
  ventes: number;
  ca: number;
}

export interface VarianteAnalysee extends ResultatBrut {
  /** Part des exposés qui ont fait l'action, en %. */
  tauxConversion: number | null;
  caParVisiteur: number | null;
  /** Comparaison à la variante de référence. `null` pour la référence elle-même. */
  versusReference: Comparaison | null;
}

export type Verdict =
  | { type: "pas_assez"; message: string }
  | { type: "aucun_ecart"; message: string }
  | { type: "gagnante"; variant: string; lift: number; pValeur: number };

export interface Analyse {
  variantes: VarianteAnalysee[];
  reference: string;
  repartition: ControleRepartition;
  verdict: Verdict;
}

/**
 * Effectif minimal avant d'oser lire un résultat.
 *
 * Ce n'est PAS une garantie de puissance statistique — la vraie taille
 * d'échantillon dépend de l'écart qu'on cherche à détecter. C'est un garde-fou
 * contre le « peeking » : regarder un test toutes les heures et l'arrêter dès
 * qu'un écart apparaît fabrique des gagnants imaginaires, parce qu'un écart
 * finit toujours par apparaître si on regarde assez souvent.
 */
export const VISITEURS_MINIMUM = 100;

/**
 * Analyse complète d'un test.
 *
 * La première variante déclarée sert de RÉFÉRENCE — c'est l'existant, celui
 * qu'on cherche à battre. Les autres sont comparées à elle, jamais entre elles :
 * comparer tout le monde à tout le monde multiplie les tests et fabrique des
 * faux positifs.
 *
 * @param critere ce qu'on regarde. « action » est le critère du test, fixé à
 *        son lancement : rejoindre le groupe, ou prendre rendez-vous. « vente »
 *        permet de vérifier après coup qu'une variante gagnante n'a pas amené
 *        des gens moins acheteurs — ça arrive, et c'est la question qui compte
 *        vraiment. À ne PAS utiliser pour choisir le gagnant après coup : c'est
 *        exactement comme ça qu'on se raconte des histoires.
 */
export function analyser(bruts: ResultatBrut[], critere: "action" | "vente" = "action"): Analyse {
  const succes = (r: ResultatBrut) => (critere === "vente" ? r.ventes : r.conversions);

  const variantes: VarianteAnalysee[] = bruts.map((r) => ({
    ...r,
    tauxConversion: r.visiteurs > 0 ? (succes(r) / r.visiteurs) * 100 : null,
    caParVisiteur: r.visiteurs > 0 ? r.ca / r.visiteurs : null,
    versusReference: null,
  }));

  const repartition = controleRepartition(
    bruts.map((r) => r.visiteurs),
    bruts.map((r) => r.poids),
  );

  const ref = variantes[0];
  if (!ref) {
    return {
      variantes, reference: "", repartition,
      verdict: { type: "pas_assez", message: "Aucune variante déclarée." },
    };
  }

  for (let i = 1; i < variantes.length; i++) {
    variantes[i].versusReference = comparerProportions(
      succes(ref), ref.visiteurs,
      succes(variantes[i]), variantes[i].visiteurs,
    );
  }

  const totalVisiteurs = bruts.reduce((a, r) => a + r.visiteurs, 0);
  const minParVariante = Math.min(...bruts.map((r) => r.visiteurs));

  let verdict: Verdict;
  if (totalVisiteurs === 0) {
    verdict = { type: "pas_assez", message: "Aucun visiteur pour l'instant." };
  } else if (minParVariante < VISITEURS_MINIMUM) {
    const manque = VISITEURS_MINIMUM - minParVariante;
    verdict = {
      type: "pas_assez",
      message: `Encore ${manque} visiteur${manque > 1 ? "s" : ""} à réunir sur la variante la moins servie avant de pouvoir lire quoi que ce soit.`,
    };
  } else {
    // La meilleure des variantes significativement différentes de la référence.
    const gagnantes = variantes
      .slice(1)
      .filter((v) => v.versusReference?.significatif && v.versusReference.lift > 0)
      .sort((a, b) => (b.versusReference!.lift) - (a.versusReference!.lift));

    if (gagnantes.length > 0) {
      const g = gagnantes[0];
      verdict = {
        type: "gagnante",
        variant: g.variant,
        lift: g.versusReference!.lift,
        pValeur: g.versusReference!.pValeur,
      };
    } else {
      verdict = {
        type: "aucun_ecart",
        message: "Aucune variante ne se détache de la référence de façon significative. Laisser tourner, ou conclure qu'elles se valent.",
      };
    }
  }

  return { variantes, reference: ref.variant, repartition, verdict };
}
