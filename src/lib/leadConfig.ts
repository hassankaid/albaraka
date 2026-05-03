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
  apporteur_quiz: { label: "Apporteur - Quiz", color: "violet" },
  quiz_scoring: { label: "Quiz Scoring", color: "amber" },
  autre: { label: "Autre", color: "gray" },
};

// Tailwind badge classes keyed by color name
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  indigo: "bg-gold-500/20 text-gold-300 border-gold-500/30",
  purple: "bg-gold-400/20 text-gold-300 border-gold-400/30",
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
  violet: "bg-gold-600/20 text-gold-300 border-gold-600/30",
  zinc: "bg-zinc-600/20 text-zinc-400 border-zinc-600/30",
  "red-light": "bg-red-300/20 text-red-300 border-red-300/30",
};

export function getSourceBadgeClass(sourceKey: string, sourceDetail?: string | null): string {
  // For meta_ads, resolve via source_detail for a more specific badge
  if (sourceKey === "meta_ads" && sourceDetail) {
    const detailCfg = leadSourceConfig[sourceDetail];
    if (detailCfg) return COLOR_CLASSES[detailCfg.color] || COLOR_CLASSES.gray;
  }
  const cfg = leadSourceConfig[sourceKey];
  if (!cfg) return COLOR_CLASSES.gray;
  return COLOR_CLASSES[cfg.color] || COLOR_CLASSES.gray;
}

export function getSourceLabel(sourceKey: string, sourceDetail?: string | null): string {
  // For meta_ads, resolve via source_detail for a more specific label
  if (sourceKey === "meta_ads" && sourceDetail) {
    const detailCfg = leadSourceConfig[sourceDetail];
    if (detailCfg) return detailCfg.label;
  }
  return leadSourceConfig[sourceKey]?.label || sourceKey;
}

// ── Lead Status Config ──

export const leadStatusConfig: Record<string, { label: string; color: string }> = {
  a_qualifier: { label: "À qualifier", color: "blue" },
  inscrit_conference: { label: "Inscrit conférence", color: "violet" },
  pas_de_reponse_post_conference: { label: "Pas de réponse post conférence", color: "amber" },
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
  "pas_de_reponse_post_conference",
  "faux_numero",
  "pas_de_reponse",
  "pas_qualifie",
  "a_relancer",
  "perdu",
  "close",
] as const;

export const LEAD_STATUS_LIST = LEAD_MANUAL_STATUSES.map((key) => ({
  value: key,
  label: leadStatusConfig[key].label,
}));

// Statuts qu'un collaborateur intermédiaire ne peut pas appliquer manuellement.
// Raison métier : ces statuts déclenchent un recyclage instantané (le lead
// quitte le pipeline du collab et part au pot "À recycler" du CEO), donc
// réservés aux profils confirmés.
const RESTRICTED_FOR_INTERMEDIAIRE = new Set<string>([
  "pas_de_reponse",
  "pas_de_reponse_post_conference",
]);

/**
 * Retourne la liste des statuts manuellement sélectionnables dans le dropdown
 * de qualification d'un lead, en fonction du rôle et du niveau.
 *
 * - CEO et collaborateurs confirmés : tous les statuts.
 * - Collaborateurs intermédiaires : "pas_de_reponse" est masqué.
 * - Cas non précisés (role/level non fournis) : liste complète par défaut
 *   (ne jamais bloquer plus que nécessaire).
 */
export function getLeadStatusListForLevel(
  role: string | null | undefined,
  collaborateurLevel: string | null | undefined,
): { value: string; label: string }[] {
  if (role === "collaborateur" && collaborateurLevel === "intermediaire") {
    return LEAD_STATUS_LIST.filter((s) => !RESTRICTED_FOR_INTERMEDIAIRE.has(s.value));
  }
  return LEAD_STATUS_LIST;
}

// ── Quiz Scoring (catégories) ──

const QUIZ_CATEGORY_BADGES: Record<string, string> = {
  chaud:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  tiede:      "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  froid:      "bg-orange-500/20 text-orange-300 border-orange-500/30",
  hors_cible: "bg-red-500/20 text-red-300 border-red-500/30",
};

const QUIZ_CATEGORY_EMOJIS: Record<string, string> = {
  chaud:      "🟢",
  tiede:      "🟡",
  froid:      "🟠",
  hors_cible: "🔴",
};

const QUIZ_CATEGORY_LABELS: Record<string, string> = {
  chaud:      "Lead chaud",
  tiede:      "Lead tiède",
  froid:      "Lead froid",
  hors_cible: "Hors cible",
};

export function getQuizCategoryBadgeClass(category: string): string {
  return QUIZ_CATEGORY_BADGES[category] || COLOR_CLASSES.gray;
}

export function getQuizCategoryEmoji(category: string): string {
  return QUIZ_CATEGORY_EMOJIS[category] || "";
}

export function getQuizCategoryLabel(category: string): string {
  return QUIZ_CATEGORY_LABELS[category] || category;
}

// Source filter options for dropdowns
export const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(leadSourceConfig).map(([key, cfg]) => ({
    value: key,
    label: cfg.label,
  })),
];

// 2-level source grouping: Ads vs Organique
export const SOURCE_GROUPS = [
  {
    label: "Ads",
    sources: ["vsl_a", "vsl_b", "webi", "instagram_ads", "whatsapp_ads"],
  },
  {
    label: "Organique",
    sources: [
      "instagram_organic",
      "apporteur_facebook",
      "apporteur_whatsapp",
      "apporteur_instagram",
      "apporteur_linkedin",
      "apporteur_recommandation",
      "apporteur_telegram",
      "apporteur_tiktok",
      "apporteur_autre",
      "apporteur_quiz",
      "quiz_scoring",
      "autre",
    ],
  },
] as const;

// Status filter options for dropdowns
export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Tous" },
  ...Object.entries(leadStatusConfig)
    .filter(([k]) => !["nouveau", "contacte", "converti"].includes(k))
    .map(([key, cfg]) => ({ value: key, label: cfg.label })),
];
