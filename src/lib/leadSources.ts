// Sources des leads : canaux et tunnels séparés (demande de Sidali du 28/10/2026).
//
// Le canal, le tunnel et la précision d'un lead sont CALCULÉS en base
// (lead_attribution, colonnes canal / tunnel / canal_precision de leads_enriched).
// Ici : les listes gérées par le CEO (lead_canaux, lead_tunnels) et l'affichage.
// Une clé inconnue de la liste chargée (base injoignable, canal tout juste créé)
// s'affiche telle quelle plutôt que de faire disparaître le lead.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { badgeCouleur } from "@/lib/leadConfig";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type GroupeCanal = "ads" | "organique" | "apporteur" | "autre";

export interface Canal {
  cle: string;
  libelle: string;
  groupe: GroupeCanal;
  couleur: string;
  actif: boolean;
  ordre: number;
  systeme: boolean;
  desactive_le: string | null;
}

export interface Tunnel {
  cle: string;
  libelle: string;
  actif: boolean;
  ordre: number;
}

export const GROUPES: { cle: GroupeCanal; nom: string }[] = [
  { cle: "ads", nom: "Ads" },
  { cle: "organique", nom: "Organique" },
  { cle: "apporteur", nom: "Apporteurs" },
  { cle: "autre", nom: "Autre" },
];

/** Les mots que les tunnels lisent déjà dans ?src= : une nouvelle source ne peut pas les prendre. */
export const MOTS_RESERVES = ["ads", "ig", "insta", "instagram_organic", "tiktok_organic", "youtube_organic", "yt", "snapchat_ads", "gads", "direct"];

export function useCanaux() {
  return useQuery({
    queryKey: ["lead-canaux"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Canal[]> => {
      const { data, error } = await db.from("lead_canaux").select("*").order("ordre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTunnels() {
  return useQuery({
    queryKey: ["lead-tunnels"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Tunnel[]> => {
      const { data, error } = await db.from("lead_tunnels").select("*").order("ordre");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface LeadAttribue {
  canal?: string | null;
  tunnel?: string | null;
  canal_precision?: string | null;
}

/** « Meta Ads · Instagram », « Apporteur · TikTok », « Snap Ads ». */
export function libelleCanal(lead: LeadAttribue, canaux: Canal[] | undefined): string {
  const c = canaux?.find((x) => x.cle === lead.canal);
  const nom = c?.libelle ?? lead.canal ?? "Sans source";
  return lead.canal_precision ? `${nom} · ${lead.canal_precision}` : nom;
}

export function libelleTunnel(cle: string | null | undefined, tunnels: Tunnel[] | undefined): string | null {
  if (!cle) return null;
  return tunnels?.find((t) => t.cle === cle)?.libelle ?? cle;
}

export function badgeCanal(cle: string | null | undefined, canaux: Canal[] | undefined): string {
  return badgeCouleur(canaux?.find((x) => x.cle === cle)?.couleur ?? "gray");
}

/** Lead publicitaire : sert aux sous-onglets « À affecter » Ads / Organique (tout le reste = organique). */
export function estAds(lead: LeadAttribue, canaux: Canal[] | undefined): boolean {
  return canaux?.find((x) => x.cle === lead.canal)?.groupe === "ads";
}

/** Même calcul que _lead_canal_cle en base : la clé d'une nouvelle source, et ce qu'on met dans ?src=. */
export function cleDepuisLibelle(libelle: string): string {
  return libelle
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "o")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/** Les sources dont le nom ressemble (pour éviter « Meta », « Meta Ads », « Facebook Ads »…). */
export function sourcesProches(libelle: string, canaux: Canal[]): Canal[] {
  const mots = cleDepuisLibelle(libelle).split("_").filter((m) => m.length >= 3 && m !== "ads");
  if (!mots.length) return [];
  return canaux.filter((c) => {
    const k = cleDepuisLibelle(c.libelle);
    return mots.some((m) => k.includes(m));
  });
}

export interface SourceSaisie {
  source: string;
  libelle: string;
}

/**
 * Les choix du formulaire « Créer un lead » : les clés de saisie manuelle dont la source est
 * active, sous leur nom actuel (« Apporteur · Instagram », « Meta Ads »…).
 */
export function useSourcesSaisie() {
  const { data: canaux } = useCanaux();
  const map = useQuery({
    queryKey: ["lead-sources-map"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<{ source: string; canal: string | null; tunnel: string | null; canal_precision: string | null }[]> => {
      const { data, error } = await db.from("lead_sources_map").select("source, canal, tunnel, canal_precision").eq("tunnel", "saisie_manuelle");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!canaux || !map.data) return [] as SourceSaisie[];
  return map.data
    .map((m) => ({ m, c: canaux.find((x) => x.cle === m.canal) }))
    .filter(({ c }) => c?.actif)
    .sort((a, b) => a.c!.ordre - b.c!.ordre || (a.m.canal_precision ?? "").localeCompare(b.m.canal_precision ?? ""))
    .map(({ m, c }) => ({ source: m.source, libelle: m.canal_precision ? `${c!.libelle} · ${m.canal_precision}` : c!.libelle }));
}
