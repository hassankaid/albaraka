// Les dépenses pub remontées par Make, regroupées par plateforme pour le tableau de bord.

const LIBELLES: Record<string, string> = { meta: "Meta", snap: "Snapchat", google: "Google" };

export interface LigneAd {
  date: string;
  amount_spent: number;
  plateforme?: string | null;
}

export interface ResumePlateforme {
  plateforme: string;
  libelle: string;
  total: number;
  dernierJour: string;
}

export function libellePlateforme(plateforme?: string | null): string {
  return LIBELLES[plateforme ?? "meta"] ?? plateforme ?? "Meta";
}

export function resumePlateformes(ads: LigneAd[]): ResumePlateforme[] {
  const parPlateforme = new Map<string, ResumePlateforme>();
  for (const a of ads) {
    const plateforme = a.plateforme ?? "meta";
    const cur = parPlateforme.get(plateforme) ?? { plateforme, libelle: libellePlateforme(plateforme), total: 0, dernierJour: "" };
    cur.total += Number(a.amount_spent ?? 0);
    // Un jour sans dépense n'est pas une preuve que la remontée fonctionne.
    if (Number(a.amount_spent ?? 0) > 0 && a.date > cur.dernierJour) cur.dernierJour = a.date;
    parPlateforme.set(plateforme, cur);
  }
  return Array.from(parPlateforme.values()).sort((a, b) => b.total - a.total);
}
