// Variantes vidéo par tunnel (A/B testing). Chaque variante = une vidéo Vimeo.
// Les règles de répartition du trafic (allocation A/B) viendront plus tard ;
// ici on définit juste les variantes et on sait afficher chacune (?v=<key>).
//
// IDs extraits des liens Vimeo fournis par Hassan (les liens n'ont pas de hash
// → vidéos publiques ou « unlisted » embeddables ; pour les vidéos à embed
// restreint, whitelister le domaine du tunnel dans Vimeo — voir README interne).
import type { TunnelKey } from "./config";

export interface TunnelVariant {
  key: string; // "1".."6"
  label: string;
  vimeoId: string;
  vimeoHash?: string | null; // hash de confidentialité (vidéos « private link ») — aucun ici
}

export const VARIANTS: Record<TunnelKey, TunnelVariant[]> = {
  wa: [
    { key: "1", label: "Variante 1", vimeoId: "1204770334" },
    { key: "2", label: "Variante 2", vimeoId: "1204770327" },
    { key: "3", label: "Variante 3", vimeoId: "1204770335" },
    { key: "4", label: "Variante 4", vimeoId: "1204817388" },
    { key: "5", label: "Variante 5", vimeoId: "1204806872" },
    { key: "6", label: "Variante 6 — Ton Street", vimeoId: "1206938051" },
  ],
  vsl: [
    { key: "1", label: "Variante 1 — Frère 1", vimeoId: "1205129866" },
    { key: "2", label: "Variante 2 — Frère 2", vimeoId: "1205129860" },
    { key: "3", label: "Variante 3 — Sœur 1", vimeoId: "1205129863" },
    { key: "4", label: "Variante 4 — Sœur 2", vimeoId: "1205186698" },
    { key: "5", label: "Variante 5 — Mixte Tenue Noire", vimeoId: "1206938046" },
    { key: "6", label: "Variante 6 — Mixte Tenue Blanche", vimeoId: "1206938052" },
  ],
};

/** Résout la variante à afficher : ?v=<key> si valide, sinon la 1re (défaut). */
export function resolveVariant(tunnelKey: TunnelKey, vParam: string | null | undefined): TunnelVariant {
  const list = VARIANTS[tunnelKey];
  const found = vParam ? list.find((v) => v.key === String(vParam)) : null;
  return found ?? list[0];
}

/** URL d'embed du player Vimeo (params propres, hash si vidéo privée). */
export function vimeoEmbedUrl(v: TunnelVariant): string {
  const params = new URLSearchParams({ title: "0", byline: "0", portrait: "0", dnt: "1" });
  if (v.vimeoHash) params.set("h", v.vimeoHash);
  return `https://player.vimeo.com/video/${v.vimeoId}?${params.toString()}`;
}
