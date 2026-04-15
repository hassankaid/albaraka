-- Permettre source = 'parcours' pour les enrollments créés via le RPC
-- unlock_formation_from_parcours (élève qui débloque une formation depuis
-- un chapitre "redirect_formation" de son parcours).

alter table public.formation_enrollments
  drop constraint formation_enrollments_source_check;

alter table public.formation_enrollments
  add constraint formation_enrollments_source_check
  check (source = any (array[
    'manual'::text,
    'systemeio'::text,
    'stripe'::text,
    'gift'::text,
    'coach_grant'::text,
    'import'::text,
    'parcours'::text
  ]));
