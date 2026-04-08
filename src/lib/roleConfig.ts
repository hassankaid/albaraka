import { Users, Headset, Target, Building2, type LucideIcon } from "lucide-react";

export interface RoleConfig {
  label: string;
  class: string;
  icon: LucideIcon;
}

export const ROLE_CONFIG: Record<string, RoleConfig> = {
  apporteur: { label: "Apporteur", class: "bg-gold-400/20 text-gold-300 border-gold-400/30", icon: Users },
  setter: { label: "Setter", class: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Headset },
  closer: { label: "Closer", class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Target },
  agence_marketing: { label: "Agence", class: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: Building2 },
  collaborateur: { label: "Collaborateur", class: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Headset },
};

export const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_CONFIG).map(([k, v]) => [k, v.label])
);
