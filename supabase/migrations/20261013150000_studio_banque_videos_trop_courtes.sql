-- ─────────────────────────────────────────────────────────────────────────
-- Banque du Studio : une vidéo sans aucun plan d'au moins 1,2 s (trop courte, ou
-- montage trop rapide) est écartée automatiquement, avec son motif, au lieu de
-- rester « à indexer » indéfiniment. Les 25 vidéos concernées à ce jour ont été
-- écartées le 13/10/2026 (14 trop courtes, 11 montages trop rapides). Sidali peut
-- en remettre une à la main.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.studio_banque_job_erreur(p_job uuid, p_jeton text, p_video uuid, p_message text)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
begin
  if p_video is null then
    update studio_banque_jobs set statut = 'erreur', rapport = jsonb_build_object('erreur', left(p_message, 1000)),
           updated_at = now() where id = j.id;
    update studio_banque_videos set statut = 'erreur', erreur = left(p_message, 1000), updated_at = now()
     where id = any(j.videos) and statut = 'indexation';
  else
    update studio_banque_videos
       set statut = 'erreur', erreur = left(p_message, 1000), updated_at = now(),
           exclue = exclue or p_message like 'Trop courte%' or p_message like 'Montage trop rapide%'
     where id = p_video and id = any(j.videos);
  end if;
end $$;
