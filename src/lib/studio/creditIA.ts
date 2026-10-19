// Studio : le suivi du crédit IA (OpenRouter), réservé au CEO. Panne du 19/10/2026 :
// crédit épuisé, tous les montages en erreur 402. La machine déclare à chaque passage
// le coût du montage et le crédit restant (studio_job_cout) ; studio_suivi_ia() résume.

export interface SuiviIA {
  credit: { reste: number; mesure_le: string } | null;
  seuil: number | null;
  /** début du suivi complet des coûts (les montages d'avant n'ont que leur dernier passage) */
  depuis: string | null;
  montages: number;
  depense: number;
  /** moyenne réelle, à partir de 3 montages terminés suivis ; sinon null */
  cout_moyen: number | null;
}

/** Coût d'un montage constaté le 19/10/2026 (3,52 $ pour une quinzaine de passages) : l'estimation de départ. */
export const COUT_ESTIME = 0.2;

export type EtatCredit = "ok" | "bas" | "epuise" | "inconnu";

export function etatCredit(s: Pick<SuiviIA, "credit" | "seuil">): EtatCredit {
  if (!s.credit) return "inconnu";
  if (s.credit.reste <= 0.5) return "epuise";
  return s.credit.reste < (s.seuil ?? 10) ? "bas" : "ok";
}

/** Combien de montages le crédit permet encore : au coût moyen réel s'il est connu, sinon à l'estimation. */
export function montagesRestants(s: Pick<SuiviIA, "credit" | "cout_moyen">): { n: number; estime: boolean } | null {
  if (!s.credit) return null;
  const cout = s.cout_moyen && s.cout_moyen > 0 ? s.cout_moyen : COUT_ESTIME;
  return { n: Math.max(0, Math.floor(s.credit.reste / cout)), estime: !(s.cout_moyen && s.cout_moyen > 0) };
}

/** 8.4 → « 8,40 $ » ; 0.213 → « 0,21 $ ». */
export function dollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(2).replace(".", ",")} $`;
}

/** Les messages de panne IA d'avant le 19/10 (« HTTP Error 402 ») : en phrase claire pour l'élève. */
export const MESSAGE_IA_INDISPONIBLE =
  "Le Studio est momentanément indisponible : le service d'intelligence artificielle ne répond plus. L'équipe est prévenue et s'en occupe. Relance ton montage un peu plus tard : ta vidéo ne sera pas recomptée.";

export function estPanneIA(detail: string | null | undefined): boolean {
  return /HTTP Error (401|402|403)\b|Payment Required/i.test(detail ?? "");
}
