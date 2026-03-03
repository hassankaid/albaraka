// ── Lead Source Config ──

export const leadSourceConfig: Record<string, { label: string; color: string }> = {
  vsl_a: { label: "VSL A", color: "blue" },
  vsl_b: { label: "VSL B", color: "indigo" },
  webi: { label: "Webinaire", color: "purple" },
  instagram_ads: { label: "Instagram Ads", color: "pink" },
  whatsapp_ads: { label: "WhatsApp Ads", color: "green" },
  instagram_organic: { label: "Instagram Organic", color: "fuchsia" },
  apporteur_facebook: { label: "Apporteur - Facebook", color: "blue" },
  apporteur_whatsapp: { label: "Apporteur - WhatsApp", color: "green" },
  apporteur_instagram: { label: "Apporteur - Instagram", color: "pink" },
  apporteur_linkedin: { label: "Apporteur - LinkedIn", color: "sky" },
  apporteur_recommandation: { label: "Apporteur - Recommandation", color: "amber" },
  apporteur_telegram: { label: "Apporteur - Telegram", color: "cyan" },
  apporteur_tiktok: { label: "Apporteur - TikTok", color: "slate" },
  apporteur_autre: { label: "Apporteur - Autre", color: "gray" },
  autre: { label: "Autre", color: "gray" },
};

// Tailwind badge classes keyed by color name
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  indigo: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  fuchsia: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  sky: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  slate: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  gray: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  yellow: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  zinc: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
  "red-light": "bg-red-300/20 text-red-300 border-red-300/30",
};

export function getSourceBadgeClass(sourceKey: string): string {
  const cfg = leadSourceConfig[sourceKey];
  if (!cfg) return COLOR_CLASSES.gray;
  return COLOR_CLASSES[cfg.color] || COLOR_CLASSES.gray;
}

export function getSourceLabel(sourceKey: string): string {
  return leadSourceConfig[sourceKey]?.label || sourceKey;
}

// ── Lead Status Config ──

export const leadStatusConfig: Record<string, { label: string; color: string }> = {
  a_qualifier: { label: "À qualifier", color: "blue" },
  inscrit_conference: { label: "Inscrit conférence", color: "violet" },
  faux_numero: { label: "Faux numéro", color: "red-light" },
  pas_de_reponse: { label: "Pas de réponse", color: "orange" },
  pas_qualifie: { label: "Pas qualifié", color: "zinc" },
  a_relancer: { label: "À relancer", color: "yellow" },
  perdu: { label: "Perdu", color: "red" },
  call_booke: { label: "Call booké", color: "purple" },
  close: { label: "Close", color: "emerald" },
  // Legacy
  nouveau: { label: "Nouveau", color: "gray" },
  contacte: { label: "Contacté", color: "sky" },
  converti: { label: "Close", color: "emerald" },
};

// Derived maps for backward-compatible usage
export const LEAD_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(leadStatusConfig).map(([k, v]) => [k, v.label])
);

export const LEAD_STATUS_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(leadStatusConfig).map(([k, v]) => [k, COLOR_CLASSES[v.color] || COLOR_CLASSES.gray])
);

// Manual statuses (for dropdowns)
export const LEAD_MANUAL_STATUSES = [
  "a_qualifier",
  "inscrit_conference",
  "faux_numero",
  "pas_de_reponse",
  "pas_qualifie",
  "a_relancer",
  "perdu",
] as const;

export const LEAD_STATUS_LIST = LEAD_MANUAL_STATUSES.map((key) => ({
  value: key,
  label: leadStatusConfig[key].label,
}));

// Source filter options for dropdowns
export const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(leadSourceConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
];

// Status filter options for dropdowns
export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(leadStatusConfig)
    .filter(([k]) => !["nouveau", "contacte", "converti"].includes(k))
    .map(([key, cfg]) => ({ value: key, label: cfg.label })),
];
