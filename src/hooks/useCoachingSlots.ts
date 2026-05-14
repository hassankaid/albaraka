// useCoachingSlots — source de vérité des 4 coachings hebdomadaires.
//
// Avant, les créneaux étaient hardcodés dans src/config/coachingSlots.ts.
// Désormais ils vivent dans la table coaching_weekly_slots, ce qui permet
// au CEO de modifier coach / jour / heure / durée sans redéploiement.
//
// Le fichier coachingSlots.ts conserve le type CoachingSlot, le type
// DayName, la constante ZOOM_COACHING et COACHING_SLOTS (désormais
// utilisé uniquement comme fallback de secours si la table est vide ou
// injoignable).

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
  coach: string;
  emoji: string | null;
  display_order: number;
  is_active: boolean;
}

/** Mappe une ligne DB vers le type CoachingSlot consommé par le frontend. */
function rowToSlot(row: CoachingWeeklySlotRow): CoachingSlot {
  return {
    id: row.id,
    day: row.day as DayName,
    hour: row.hour,
    minute: row.minute,
    durationMinutes: row.duration_minutes,
    title: row.title,
    coach: row.coach,
    emoji: row.emoji ?? undefined,
  };
}

/**
 * Charge les créneaux hebdomadaires actifs depuis la DB — version
 * impérative (hors React Query) pour les hooks qui font déjà leur propre
 * fetch (useCoachingTracking, useAdminCoachingReplays...). Fallback sur la
 * constante hardcodée COACHING_SLOTS si la table est vide ou injoignable.
 */
export async function fetchActiveCoachingSlots(): Promise<CoachingSlot[]> {
  const { data, error } = await supabase
    .from("coaching_weekly_slots" as any)
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) {
    console.error("[fetchActiveCoachingSlots] fallback config", error);
    return COACHING_SLOTS;
  }
  const rows = (data ?? []) as unknown as CoachingWeeklySlotRow[];
  if (rows.length === 0) return COACHING_SLOTS;
  return rows.map(rowToSlot);
}

/**
 * Charge les créneaux hebdomadaires actifs depuis la base, triés par
 * display_order. En cas d'erreur ou de table vide, retombe sur la
 * constante hardcodée COACHING_SLOTS pour ne jamais casser le calendrier.
 */
export function useCoachingSlots() {
  return useQuery({
    queryKey: ["coaching-weekly-slots"],
    queryFn: fetchActiveCoachingSlots,
    staleTime: 5 * 60_000, // 5 min — change rarement
  });
}

// ─── Admin : lecture complète (y compris créneaux inactifs) ───
export interface AdminCoachingSlot extends CoachingSlot {
  displayOrder: number;
  isActive: boolean;
}

export function useAdminCoachingSlots() {
  return useQuery({
    queryKey: ["coaching-weekly-slots", "admin"],
    queryFn: async (): Promise<AdminCoachingSlot[]> => {
      const { data, error } = await supabase
        .from("coaching_weekly_slots" as any)
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as CoachingWeeklySlotRow[];
      return rows.map((row) => ({
        ...rowToSlot(row),
        displayOrder: row.display_order,
        isActive: row.is_active,
      }));
    },
  });
}

// ─── Admin : mise à jour d'un créneau ───
export interface UpdateCoachingSlotInput {
  id: string;
  day?: DayName;
  hour?: number;
  minute?: number;
  durationMinutes?: number;
  title?: string;
  coach?: string;
  emoji?: string | null;
  isActive?: boolean;
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
      if (input.coach !== undefined) patch.coach = input.coach;
      if (input.emoji !== undefined) patch.emoji = input.emoji;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const { error } = await supabase
        .from("coaching_weekly_slots" as any)
        .update(patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Invalide les deux vues (calendrier + admin)
      qc.invalidateQueries({ queryKey: ["coaching-weekly-slots"] });
    },
  });
}
