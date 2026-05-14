// useCoachingSlots — source de vérité des 4 coachings hebdomadaires.
//
// Architecture (depuis l'unification du 14/05/2026) :
//   - coaching_weekly_slots : le PLANNING (jour, heure, durée, emoji, titre)
//     de chaque créneau hebdomadaire.
//   - coaching_weekly_slots.coach_type_id → coach_types : le THÈME de
//     coaching rattaché au créneau.
//   - coach_types.assigned_coach_id → profiles : le COACH du thème.
//
// Le coach affiché sur le calendrier est donc DÉRIVÉ du thème. Conséquence :
// changer le coach (depuis l'onglet "Coachs" OU "Coachings hebdo") modifie
// la même donnée — plus de double saisie.
//
// Le fichier coachingSlots.ts conserve le type CoachingSlot, le type
// DayName, la constante ZOOM_COACHING et COACHING_SLOTS (fallback de
// secours si la table est vide ou injoignable).

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  COACHING_SLOTS,
  type CoachingSlot,
  type DayName,
} from "@/config/coachingSlots";

// Ligne brute de la table coaching_weekly_slots
interface CoachingWeeklySlotRow {
  id: string;
  day: string;
  hour: number;
  minute: number;
  duration_minutes: number;
  title: string;
  coach: string; // texte libre — fallback uniquement
  emoji: string | null;
  display_order: number;
  is_active: boolean;
  coach_type_id: string | null;
}

interface CoachTypeRow {
  id: string;
  label: string;
  assigned_coach_id: string | null;
}

/** Premier mot du full_name, en Title Case ("SABRINA DA CUNHA" → "Sabrina"). */
export function coachFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * Charge les créneaux + résout le coach via coach_types → profiles.
 * Renvoie aussi les métadonnées admin (coachTypeId, displayOrder, isActive)
 * pour l'éditeur. Fallback sur COACHING_SLOTS si la table est vide/injoignable.
 */
async function loadSlots(activeOnly: boolean): Promise<AdminCoachingSlot[]> {
  let query = supabase
    .from("coaching_weekly_slots" as any)
    .select("*")
    .order("display_order", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);

  const [slotsRes, typesRes] = await Promise.all([
    query,
    supabase.from("coach_types").select("id, label, assigned_coach_id"),
  ]);

  if (slotsRes.error) {
    console.error("[useCoachingSlots] fallback config", slotsRes.error);
    return COACHING_SLOTS.map((s) => ({
      ...s,
      coachTypeId: null,
      coachTypeLabel: null,
      displayOrder: 0,
      isActive: true,
    }));
  }

  const rows = (slotsRes.data ?? []) as unknown as CoachingWeeklySlotRow[];
  if (rows.length === 0) {
    return COACHING_SLOTS.map((s) => ({
      ...s,
      coachTypeId: null,
      coachTypeLabel: null,
      displayOrder: 0,
      isActive: true,
    }));
  }

  const types = (typesRes.data ?? []) as CoachTypeRow[];
  const typeById = new Map(types.map((t) => [t.id, t]));

  // Résout les noms des coachs assignés (une seule requête).
  const coachIds = Array.from(
    new Set(types.map((t) => t.assigned_coach_id).filter(Boolean)),
  ) as string[];
  const coachNameById = new Map<string, string>();
  if (coachIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", coachIds);
    for (const p of (profs ?? []) as { id: string; full_name: string | null }[]) {
      coachNameById.set(p.id, p.full_name ?? "");
    }
  }

  return rows.map((row) => {
    const type = row.coach_type_id ? typeById.get(row.coach_type_id) : null;
    const derivedCoach =
      type?.assigned_coach_id
        ? coachFirstName(coachNameById.get(type.assigned_coach_id))
        : "";
    return {
      id: row.id,
      day: row.day as DayName,
      hour: row.hour,
      minute: row.minute,
      durationMinutes: row.duration_minutes,
      title: row.title,
      // Coach dérivé du thème ; fallback sur le texte libre si pas de thème
      // rattaché ou pas de coach assigné au thème.
      coach: derivedCoach || row.coach,
      emoji: row.emoji ?? undefined,
      coachTypeId: row.coach_type_id,
      coachTypeLabel: type?.label ?? null,
      displayOrder: row.display_order,
      isActive: row.is_active,
    };
  });
}

// CoachingSlot enrichi des métadonnées admin
export interface AdminCoachingSlot extends CoachingSlot {
  coachTypeId: string | null;
  coachTypeLabel: string | null;
  displayOrder: number;
  isActive: boolean;
}

/**
 * Version impérative (hors React Query) pour les hooks qui font déjà leur
 * propre fetch (useCoachingTracking, useAdminCoachingReplays...).
 */
export async function fetchActiveCoachingSlots(): Promise<CoachingSlot[]> {
  const slots = await loadSlots(true);
  // On ne renvoie que le type CoachingSlot de base aux consommateurs simples.
  return slots.map(({ coachTypeId, coachTypeLabel, displayOrder, isActive, ...slot }) => slot);
}

/** Créneaux actifs pour le calendrier (React Query). */
export function useCoachingSlots() {
  return useQuery({
    queryKey: ["coaching-weekly-slots"],
    queryFn: fetchActiveCoachingSlots,
    staleTime: 5 * 60_000,
  });
}

/** Tous les créneaux (y compris inactifs) avec métadonnées admin. */
export function useAdminCoachingSlots() {
  return useQuery({
    queryKey: ["coaching-weekly-slots", "admin"],
    queryFn: () => loadSlots(false),
  });
}

// ─── Liste des coachs (profiles is_coach) pour les Select admin ───
export interface CoachOption {
  id: string;
  fullName: string;
  firstName: string;
}

export function useCoachOptions() {
  return useQuery({
    queryKey: ["coaching-coach-options"],
    queryFn: async (): Promise<CoachOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_coach", true)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return ((data ?? []) as { id: string; full_name: string | null }[]).map((p) => ({
        id: p.id,
        fullName: p.full_name ?? "",
        firstName: coachFirstName(p.full_name),
      }));
    },
  });
}

// ─── Liste des thèmes de coaching (coach_types) ───
export interface CoachThemeOption {
  id: string;
  label: string;
  assignedCoachId: string | null;
}

export function useCoachThemes() {
  return useQuery({
    queryKey: ["coaching-themes"],
    queryFn: async (): Promise<CoachThemeOption[]> => {
      const { data, error } = await supabase
        .from("coach_types")
        .select("id, label, assigned_coach_id, display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return ((data ?? []) as CoachTypeRow[]).map((t) => ({
        id: t.id,
        label: t.label,
        assignedCoachId: t.assigned_coach_id,
      }));
    },
  });
}

// ─── Admin : mise à jour du planning d'un créneau (jour/heure/durée/etc.) ───
export interface UpdateCoachingSlotInput {
  id: string;
  day?: DayName;
  hour?: number;
  minute?: number;
  durationMinutes?: number;
  title?: string;
  emoji?: string | null;
  isActive?: boolean;
  coachTypeId?: string | null;
}

export function useUpdateCoachingSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateCoachingSlotInput) => {
      const patch: Record<string, unknown> = {};
      if (input.day !== undefined) patch.day = input.day;
      if (input.hour !== undefined) patch.hour = input.hour;
      if (input.minute !== undefined) patch.minute = input.minute;
      if (input.durationMinutes !== undefined) patch.duration_minutes = input.durationMinutes;
      if (input.title !== undefined) patch.title = input.title;
      if (input.emoji !== undefined) patch.emoji = input.emoji;
      if (input.isActive !== undefined) patch.is_active = input.isActive;
      if (input.coachTypeId !== undefined) patch.coach_type_id = input.coachTypeId;

      if (Object.keys(patch).length > 0) {
        const { error } = await supabase
          .from("coaching_weekly_slots" as any)
          .update(patch)
          .eq("id", input.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-weekly-slots"] });
    },
  });
}

// ─── Admin : changer le coach d'un thème (source unique partagée) ───
// Met à jour coach_types.assigned_coach_id. Répercuté partout : calendrier
// hebdo, onglet "Coachs", sessions individuelles.
export function useAssignCoachToTheme() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { coachTypeId: string; coachId: string | null }) => {
      const { error } = await supabase
        .from("coach_types")
        .update({ assigned_coach_id: input.coachId })
        .eq("id", input.coachTypeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coaching-weekly-slots"] });
      qc.invalidateQueries({ queryKey: ["coaching-themes"] });
      qc.invalidateQueries({ queryKey: ["admin-coach-types-with-assignments"] });
    },
  });
}
