-- ─────────────────────────────────────────────────────────────────────────
-- Studio, voix off : les élèves voient l'image des plans (vocal de Sidali, 19/10/2026).
--
-- « Changer ce plan » montrait des cases noires aux élèves : la banque (fiches
-- studio_banque_plans et bucket studio-banque) n'est lisible que par le CEO,
-- l'écran datant d'avant l'ouverture du Studio aux élèves (13/10).
-- On n'ouvre que le strict nécessaire :
-- 1. studio_vignettes_plans(ids) : pour chaque plan demandé, le chemin d'UNE image
--    (pas la fiche, ni le texte, ni le vecteur) ; réservé à qui a accès au Studio ;
-- 2. la lecture des images de la banque (dossier images/, ~25 Ko chacune) pour qui
--    a accès au Studio. Les vidéos (originaux/, travail/) et les sons restent au CEO.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.studio_vignettes_plans(p_ids uuid[])
returns table (id uuid, image text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(p.images[2], p.images[1])
  from public.studio_banque_plans p
  where public.studio_ouvert(auth.uid())
    and p.id = any (p_ids[1:300]);
$$;

revoke all on function public.studio_vignettes_plans(uuid[]) from public, anon;
grant execute on function public.studio_vignettes_plans(uuid[]) to authenticated;

drop policy if exists studio_banque_vignettes on storage.objects;
create policy studio_banque_vignettes on storage.objects
  for select to authenticated
  using (
    bucket_id = 'studio-banque'
    and name like 'images/%'
    and public.studio_ouvert(auth.uid())
  );
