-- Suppression des tables group_coaching_* : la source de vérité des 4 créneaux
-- est désormais hardcodée côté client (src/config/coachingSlots.ts).

drop function if exists public.generate_recurrence_occurrences(uuid, timestamptz) cascade;
drop table if exists public.group_coaching_sessions cascade;
drop table if exists public.group_coaching_recurrences cascade;
