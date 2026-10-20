-- ─────────────────────────────────────────────────────────────────────────
-- Studio : « Vérifier les coupes » ne s'ouvrait pas après un montage relancé
-- (retour de Sidali du 20/10/2026, vidéo 2.mov).
--
-- Un montage relancé après une préparation ratée passe en mode « complet » : la
-- machine prépare puis rend d'un seul trait, sans studio_job_fin_preparation. Le
-- travail (travail.json) est bien déposé, mais travail_pret restait à false, et la
-- page n'affiche « Vérifier les coupes » / « Corriger les sous-titres » que si
-- travail_pret est vrai.
--
-- studio_job_terminer reçoit maintenant le réglage du son de la préparation
-- (p_audio, facultatif : l'ancienne machine l'appelle encore sans) et marque la
-- préparation disponible. Les montages déjà touchés sont réparés.
-- ─────────────────────────────────────────────────────────────────────────

drop function if exists public.studio_job_terminer(uuid, text, text, jsonb);

create or replace function public.studio_job_terminer(
  p_id uuid, p_jeton text, p_sortie_path text, p_rapport jsonb, p_audio text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m studio_montages;
begin
  m := _studio_job(p_id, p_jeton);
  update studio_montages
     set statut = 'termine', etape = null, lance = false, sortie_path = p_sortie_path, rapport = p_rapport,
         termine_le = now(), jeton_hash = null, updated_at = now(),
         -- la préparation déposée par ce montage sert aux corrections (coupes, sous-titres)
         travail_pret = travail_pret or p_audio is not null,
         audio_prepare = coalesce(p_audio, audio_prepare)
   where id = p_id;
  insert into notifications (user_id, type, title, body, link, metadata)
  values (m.user_id, 'studio_termine', 'Ta vidéo est prête',
          coalesce(m.source_nom, 'Ton montage') || ' : tu peux la regarder et la télécharger.',
          '/studio/montage/' || p_id, jsonb_build_object('montage_id', p_id));
end $$;

grant execute on function public.studio_job_terminer(uuid, text, text, jsonb, text) to anon, authenticated;

-- ── réparation : montages terminés dont la préparation existe mais n'est pas marquée ──
-- (le réglage du son est celui des réglages du montage, comme le calcule studio_job_fin_preparation)
update public.studio_montages m
   set travail_pret = true,
       audio_prepare = case when coalesce((m.reglages #>> '{son,ameliorer}')::boolean, true)
                            then coalesce(m.reglages #>> '{son,niveau}', 'normal') else 'off' end
 where m.statut = 'termine'
   and not m.travail_pret
   and exists (select 1 from storage.objects o
                where o.name = m.user_id || '/' || m.id || '/travail/travail.json');
