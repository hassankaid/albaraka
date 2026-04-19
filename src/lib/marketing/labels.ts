// Libellés lisibles pour les valeurs brutes stockées en DB (leads.source, lead_tags.*).
// Si une valeur n'est pas dans la map → fallback sur une version capitalisée "Title Case".

const SOURCE_LABELS: Record<string, string> = {
  webi: "Webinaire",
  vsl_a: "VSL A",
  vsl_b: "VSL B",
  instagram_ads: "Instagram (Ads)",
  whatsapp_ads: "WhatsApp (Ads)",
  instagram_organic: "Instagram (Organique)",
  apporteur_instagram: "Apporteur Instagram",
  apporteur_facebook: "Apporteur Facebook",
  apporteur_tiktok: "Apporteur TikTok",
  apporteur_whatsapp: "Apporteur WhatsApp",
  apporteur_telegram: "Apporteur Telegram",
  apporteur_linkedin: "Apporteur LinkedIn",
  apporteur_recommandation: "Apporteur (Recommandation)",
  apporteur_autre: "Apporteur (Autre)",
  autre: "Autre",
  inconnu: "Inconnu",
};

const TAG_CATEGORY_LABELS: Record<string, string> = {
  profil: "Profil",
  budget: "Budget",
  autre: "Autre",
};

const TAG_KEY_LABELS: Record<string, string> = {
  // Profil
  salarie: "Salarié·e",
  sans_emploi: "Sans emploi",
  entrepreneur: "Entrepreneur·e",
  etudiant: "Étudiant·e",
  accent_prononce: "Accent prononcé",
  ne_parle_pas_bien_francais: "Parle peu français",
  pas_a_laise_avec_les_gens: "Peu à l'aise socialement",
  // Budget
  zero_budget: "Zéro budget",
  budget_qualifie: "Budget qualifié",
  budget_a_venir: "Budget à venir",
  // Autre
  pas_de_temps: "Pas de temps",
  trop_mefiant: "Trop méfiant",
  non_musulman: "Non musulman",
};

const CHANNEL_LABELS: Record<string, string> = {
  meta: "Meta",
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  youtube: "YouTube",
  google: "Google",
  inconnu: "Inconnu",
};

/** Fallback : remplace les "_" par des espaces + capitalise chaque mot. */
function titleCase(raw: string): string {
  return raw
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function sourceLabel(raw: string | null | undefined): string {
  if (!raw) return "Inconnu";
  return SOURCE_LABELS[raw] ?? titleCase(raw);
}

export function tagCategoryLabel(raw: string | null | undefined): string {
  if (!raw) return "Autre";
  return TAG_CATEGORY_LABELS[raw] ?? titleCase(raw);
}

export function tagKeyLabel(raw: string | null | undefined): string {
  if (!raw) return "—";
  return TAG_KEY_LABELS[raw] ?? titleCase(raw);
}

export function channelLabel(raw: string | null | undefined): string {
  if (!raw) return "Inconnu";
  const k = raw.toLowerCase();
  return CHANNEL_LABELS[k] ?? titleCase(raw);
}

/** Couleur sémantique associée à une source (utilisée dans les charts). */
export function sourceColor(raw: string): string {
  const k = raw.toLowerCase();
  if (k.startsWith("webi")) return "#8b5cf6"; // violet
  if (k.startsWith("vsl_a")) return "#06b6d4"; // cyan
  if (k.startsWith("vsl_b")) return "#0ea5e9"; // sky
  if (k.includes("instagram")) return "#e4405f"; // rose instagram
  if (k.includes("whatsapp")) return "#25d366"; // vert whatsapp
  if (k.includes("tiktok")) return "#000000"; // noir tiktok
  if (k.includes("facebook")) return "#1877f2"; // bleu fb
  if (k.includes("telegram")) return "#26a5e4";
  if (k.includes("linkedin")) return "#0a66c2";
  if (k.startsWith("apporteur")) return "#f59e0b"; // ambre
  return "#6b7280"; // gris neutre
}

/** Couleur pour une catégorie de tag. */
export function tagCategoryColor(raw: string): string {
  const k = raw.toLowerCase();
  if (k === "profil") return "hsl(var(--primary))";
  if (k === "budget") return "hsl(var(--kpi-paid))";
  return "hsl(var(--muted-foreground))";
}
