// ─────────────────────────────────────────────────────────────────────────
// Plan d'un abonnement Stripe recréé sur la carte enregistrée du client
// (outil « Replanifier », depuis le 12/11/2026).
//
// Avant : « Replanifier » arrêtait l'abonnement puis attendait que le client
// ouvre un lien de re-paiement. Lien jamais utilisé = plus aucun prélèvement,
// sans alerte (Imène Bachir, Lahcen Liatim, Ouissam Fares). Désormais, quand
// la carte du client est réutilisable, le nouvel abonnement est créé tout de
// suite sur cette carte.
//
// Module PUR (aucune dépendance) : partagé par la fonction serveur
// reprogrammer-sur-carte et par ses tests (src/lib/planAbonnement.test.ts).
// ─────────────────────────────────────────────────────────────────────────

export interface EcheanceAPlanifier {
  amount: number; // euros
  due_date: string; // YYYY-MM-DD
}

export interface PlanAbonnement {
  /** Montant mensuel facturé par l'abonnement, en centimes. */
  mensuelCents: number;
  /** Centimes en plus sur la 1re échéance (reste de la division), 0 sinon. */
  supplementPremiereCents: number;
  /** Nombre de prélèvements. */
  nombre: number;
  /** 1er prélèvement (fin de la période d'essai), timestamp Unix. */
  trialEnd: number;
  /** Arrêt automatique : fin EXACTE de la N-ième période, timestamp Unix. */
  cancelAt: number;
}

export type ResultatPlan = { ok: true; plan: PlanAbonnement } | { ok: false; raison: string };

/** Heure de prélèvement : 09:00 UTC (10:00 ou 11:00 à Paris). */
const HEURE_UTC = 9;
/** Marge minimale avant le 1er prélèvement quand l'échéance est déjà due. */
const MARGE_MIN_SECONDES = 15 * 60;

/**
 * Ajoute n mois à une date UTC en gardant le jour, ramené au dernier jour du
 * mois si besoin (31/01 + 1 mois = 28/02) — même règle que Stripe pour les
 * périodes mensuelles.
 */
export function ajouterMoisUTC(d: Date, n: number): Date {
  const annee = d.getUTCFullYear();
  const mois = d.getUTCMonth() + n;
  const dernierJour = new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate();
  const jour = Math.min(d.getUTCDate(), dernierJour);
  return new Date(Date.UTC(annee, mois, jour, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
}

/**
 * Calcule l'abonnement à créer pour des échéances en attente (triées dans
 * l'ordre). Refuse les plans que Stripe ne sait pas reproduire au centime :
 * l'abonnement facture un montant FIXE chaque mois, seule la 1re échéance
 * peut porter quelques centimes en plus (c'est ce que produit le calcul du
 * plan dans l'outil « Replanifier »).
 */
export function calculerPlan(echeances: EcheanceAPlanifier[], maintenant: Date): ResultatPlan {
  if (echeances.length === 0) return { ok: false, raison: "aucune échéance en attente" };

  const cents = echeances.map((e) => Math.round(Number(e.amount) * 100));
  if (cents.some((c) => !Number.isFinite(c) || c <= 0)) {
    return { ok: false, raison: "montant d'échéance invalide" };
  }
  const mensuelCents = cents[cents.length - 1];
  if (cents.slice(1).some((c) => c !== mensuelCents)) {
    return { ok: false, raison: "les échéances n'ont pas toutes le même montant" };
  }
  const supplementPremiereCents = cents[0] - mensuelCents;
  if (supplementPremiereCents < 0) {
    return { ok: false, raison: "la 1re échéance est plus petite que les suivantes" };
  }

  // Les échéances doivent se suivre de mois en mois, comme les prélèvements
  // d'un abonnement mensuel.
  const premiere = new Date(`${echeances[0].due_date}T00:00:00Z`);
  if (Number.isNaN(premiere.getTime())) return { ok: false, raison: "date d'échéance invalide" };
  for (let i = 1; i < echeances.length; i++) {
    const attendue = ajouterMoisUTC(premiere, i).toISOString().slice(0, 10);
    if (echeances[i].due_date !== attendue) {
      return { ok: false, raison: "les échéances ne tombent pas tous les mois à la même date" };
    }
  }

  // 1er prélèvement : la date de la 1re échéance à 09:00 UTC, ou dans 15 min
  // si cette heure est déjà passée (échéance du jour ou en retard).
  const prevue = Date.UTC(
    premiere.getUTCFullYear(), premiere.getUTCMonth(), premiere.getUTCDate(), HEURE_UTC,
  ) / 1000;
  const auPlusTot = Math.floor(maintenant.getTime() / 1000) + MARGE_MIN_SECONDES;
  const trialEnd = Math.max(prevue, auPlusTot);

  // Arrêt à la fin exacte de la N-ième période : ni prorata, ni (N+1)-ième facture.
  const cancelAt = Math.floor(ajouterMoisUTC(new Date(trialEnd * 1000), echeances.length).getTime() / 1000);

  return {
    ok: true,
    plan: { mensuelCents, supplementPremiereCents, nombre: echeances.length, trialEnd, cancelAt },
  };
}

/** La carte expire-t-elle avant le mois du 1er prélèvement ? */
export function carteExpireeAvant(expMois: number, expAnnee: number, timestamp: number): boolean {
  const d = new Date(timestamp * 1000);
  const annee = d.getUTCFullYear();
  const mois = d.getUTCMonth() + 1;
  return expAnnee < annee || (expAnnee === annee && expMois < mois);
}
