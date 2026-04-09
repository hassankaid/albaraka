// ── Lead Tags Catalog ──────────────────────────────────────────────────────
// Système d'étiquettes pour qualifier les leads en 3 catégories.
// Persisté dans la table public.lead_tags via ProcessLeadModal.
// Utilisé pour produire une synthèse marketing hebdomadaire (Sidali).

export type LeadTagCategory = "profil" | "budget" | "autre";

export interface LeadTagDefinition {
  key: string;
  label: string;
  category: LeadTagCategory;
}

export interface LeadTagCategoryDefinition {
  key: LeadTagCategory;
  label: string;
  multiple: boolean;
  hint?: string;
}

export const LEAD_TAG_CATEGORIES: LeadTagCategoryDefinition[] = [
  { key: "profil", label: "Profil", multiple: true },
  { key: "budget", label: "Budget", multiple: false, hint: "1 max" },
  { key: "autre",  label: "Autre",  multiple: true },
];

export const LEAD_TAGS: LeadTagDefinition[] = [
  // ── Profil (multi-select) ──
  { key: "pas_a_laise_avec_les_gens",  label: "Pas à l'aise avec les gens", category: "profil" },
  { key: "accent_prononce",            label: "Accent prononcé",            category: "profil" },
  { key: "ne_parle_pas_bien_francais", label: "Ne parle pas bien français", category: "profil" },
  { key: "sans_emploi",                label: "Sans emploi",                category: "profil" },
  { key: "salarie",                    label: "Salarié",                    category: "profil" },
  { key: "etudiant",                   label: "Étudiant",                   category: "profil" },
  { key: "entrepreneur",               label: "Entrepreneur",               category: "profil" },

  // ── Budget (single-select dans la catégorie) ──
  { key: "zero_budget",                label: "Zéro budget",                category: "budget" },
  { key: "budget_a_venir",             label: "Budget à venir",             category: "budget" },
  { key: "budget_qualifie",            label: "Budget qualifié",            category: "budget" },

  // ── Autre (multi-select) ──
  { key: "pas_de_temps",               label: "Pas de temps à consacrer",   category: "autre" },
  { key: "trop_mefiant",               label: "Trop méfiant",               category: "autre" },
  { key: "non_musulman",               label: "Non musulman",               category: "autre" },
];

export function getTagsByCategory(category: LeadTagCategory): LeadTagDefinition[] {
  return LEAD_TAGS.filter((t) => t.category === category);
}

export function getTagLabel(key: string): string {
  return LEAD_TAGS.find((t) => t.key === key)?.label || key;
}

export function getTagDefinition(key: string): LeadTagDefinition | undefined {
  return LEAD_TAGS.find((t) => t.key === key);
}

// Classes Tailwind par catégorie (cohérent avec leadConfig.ts)
export const LEAD_TAG_CATEGORY_CLASSES: Record<LeadTagCategory, { active: string; inactive: string }> = {
  profil: {
    active:   "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30",
    inactive: "bg-transparent text-muted-foreground border-border hover:bg-secondary/50",
  },
  budget: {
    active:   "bg-gold-500/20 text-gold-300 border-gold-500/50 hover:bg-gold-500/30",
    inactive: "bg-transparent text-muted-foreground border-border hover:bg-secondary/50",
  },
  autre: {
    active:   "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30",
    inactive: "bg-transparent text-muted-foreground border-border hover:bg-secondary/50",
  },
};
