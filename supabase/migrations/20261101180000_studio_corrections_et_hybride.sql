-- Studio, améliorations de Sidali (décisions du 01/11/2026) :
--  - corrections enregistrées sans relancer le montage, puis un seul rendu final ;
--  - format hybride, réservé à la formule complète, vérifié ici et pas seulement à l'écran.
-- Appliqué en base le 01/11/2026.

alter table public.studio_montages add column if not exists reglages_attente jsonb;

alter table public.studio_montages drop constraint if exists studio_montages_outil_check;
alter table public.studio_montages add constraint studio_montages_outil_check
  check (outil = any (array['face_camera'::text, 'voix_off'::text, 'hybride'::text]));

-- Les corrections de l'élève, en attente du prochain montage ; null les annule.
create or replace function public.studio_enregistrer_corrections(p_id uuid, p_reglages jsonb)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if p_reglages is not null and jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Réglages invalides';
  end if;
  update studio_montages
     set reglages_attente = p_reglages, updated_at = now()
   where id = p_id and user_id = auth.uid() and statut in ('termine', 'erreur');
  if not found then
    raise exception 'Cette vidéo ne peut pas être corrigée pour le moment.';
  end if;
end $$;
revoke execute on function public.studio_enregistrer_corrections(uuid, jsonb) from public, anon;
grant execute on function public.studio_enregistrer_corrections(uuid, jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.studio_lancer(p_id uuid, p_reglages jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  m studio_montages;
  v_jeton text;
  v_audio text;
begin
  select * into m from studio_montages where id = p_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Montage introuvable';
  end if;
  if m.outil = 'hybride' and coalesce(public.studio_quota(auth.uid()) ->> 'formule', 'gratuit') <> 'complet' then
    raise exception 'Le format hybride est réservé à l''abonnement Studio.' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Réglages invalides';
  end if;
  v_audio := case when coalesce((p_reglages #>> '{son,ameliorer}')::boolean, true)
                  then coalesce(p_reglages #>> '{son,niveau}', 'normal') else 'off' end;

  if m.statut = 'preparation' then
    -- la machine de préparation enchaînera le rendu en finissant
    update studio_montages set reglages = p_reglages, reglages_attente = null, lance = true, updated_at = now() where id = p_id;
    return jsonb_build_object('action', 'attendre');
  elsif m.statut in ('en_cours', 'import') then
    return jsonb_build_object('action', 'occupe');
  end if;

  -- Montage d'avant le quota, jamais compté : il compte à son premier lancement.
  perform public.studio_compter_video(p_id);

  v_jeton := encode(gen_random_bytes(24), 'hex');
  update studio_montages
     set reglages = p_reglages, reglages_attente = null, lance = true, statut = 'en_cours', etape = 'file', erreur = null,
         version = version + 1, jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id;
  return jsonb_build_object(
    'action', 'demarrer', 'jeton', v_jeton, 'version', m.version + 1,
    'mode', case when m.travail_pret and m.audio_prepare = v_audio then 'rendu' else 'complet' end);
end $function$;

CREATE OR REPLACE FUNCTION public.studio_preparer(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_jeton text := encode(gen_random_bytes(24), 'hex');
begin
  if not exists (select 1 from studio_montages where id = p_id and user_id = auth.uid()
                   and statut in ('import', 'erreur') and source_path is not null) then
    raise exception 'Montage introuvable ou déjà en préparation';
  end if;
  if exists (select 1 from studio_montages where id = p_id and outil = 'hybride')
     and coalesce(public.studio_quota(auth.uid()) ->> 'formule', 'gratuit') <> 'complet' then
    raise exception 'Le format hybride est réservé à l''abonnement Studio.' using errcode = 'P0001';
  end if;
  perform public.studio_compter_video(p_id);
  update studio_montages
     set statut = 'preparation', etape = 'reception', erreur = null,
         jeton_hash = encode(digest(v_jeton, 'sha256'), 'hex'), updated_at = now()
   where id = p_id and user_id = auth.uid() and statut in ('import', 'erreur')
     and source_path is not null;
  return v_jeton;
end $function$;
