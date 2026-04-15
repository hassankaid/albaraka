-- Les coachings sont maintenant hardcodés côté client (src/config/coachingSlots.ts)
-- avec des slugs stables (ex. "setting-telephonique") au lieu d'UUIDs DB.
-- On migre donc la colonne selected_recurrence_ids de uuid[] vers text[].

alter table public.user_organisation_plans
  alter column selected_recurrence_ids type text[] using selected_recurrence_ids::text[];

alter table public.user_organisation_plans
  alter column selected_recurrence_ids set default '{}'::text[];
