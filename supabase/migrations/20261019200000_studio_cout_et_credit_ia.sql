-- ─────────────────────────────────────────────────────────────────────────
-- Studio : le vrai coût de chaque montage, et l'alerte « crédit IA bas »
-- (panne du 19/10/2026 : crédit OpenRouter épuisé, tous les montages en erreur 402).
--
-- 1. studio_montages.cout_ia_usd : le coût IA cumulé du montage, tous passages
--    compris (préparation, rendu, relances, essais ratés). Avant, le rapport ne
--    gardait que le dernier passage.
-- 2. studio_job_cout : la machine y déclare, à la fin de chaque passage, ce qu'elle
--    a dépensé depuis sa dernière déclaration et le crédit restant chez OpenRouter.
--    Le crédit ne baisse que quand des montages tournent : le mesurer à chaque
--    passage suffit, sans tâche planifiée ni clé de plus.
-- 3. Alerte : si le crédit passe sous le seuil (studio_config.credit_alerte_seuil,
--    10 $ par défaut) ou si l'IA refuse les appels, chaque CEO reçoit une
--    notification, au plus une toutes les 12 heures (une panne alerte tout de suite).
-- 4. studio_suivi_ia() : le résumé pour la carte « Crédit IA » du Studio (CEO).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.studio_montages
  add column if not exists cout_ia_usd numeric(10, 5) not null default 0;

comment on column public.studio_montages.cout_ia_usd is
  'Coût IA cumulé du montage en dollars (tous passages, essais ratés compris), déclaré par la machine (studio_job_cout).';

-- les montages d'avant : on reprend ce que le rapport connaissait (sous-estimé, faute de mieux)
update public.studio_montages
   set cout_ia_usd = coalesce((rapport->'cout_usd'->>'ia')::numeric, 0) + coalesce((rapport->'cout_usd'->>'transcription')::numeric, 0)
 where cout_ia_usd = 0 and rapport ? 'cout_usd';

insert into public.studio_config (cle, valeur) values ('credit_alerte_seuil', '10')
on conflict (cle) do nothing;

create or replace function public.studio_job_cout(
  p_id uuid, p_jeton text, p_cout numeric, p_credit numeric default null, p_panne text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  seuil numeric := coalesce((studio_config_valeur('credit_alerte_seuil'))::text::numeric, 10);
  derniere timestamptz := (studio_config_valeur('credit_alerte_le') #>> '{}')::timestamptz;
  titre text;
  corps text;
begin
  perform _studio_job(p_id, p_jeton);
  update studio_montages
     set cout_ia_usd = cout_ia_usd + greatest(0, least(coalesce(p_cout, 0), 5))
   where id = p_id;

  if p_credit is not null then
    insert into studio_config (cle, valeur)
    values ('credit_ia', jsonb_build_object('reste', round(p_credit, 2), 'mesure_le', now()))
    on conflict (cle) do update set valeur = excluded.valeur;
  end if;

  if p_panne is null and (p_credit is null or p_credit >= seuil) then
    return;
  end if;
  -- une alerte toutes les 12 heures au plus, sauf panne déclarée (alerte immédiate, 1 par heure)
  if derniere is not null
     and derniere > now() - (case when p_panne is not null then interval '1 hour' else interval '12 hours' end) then
    return;
  end if;

  if p_panne = 'cle' then
    titre := 'Studio en panne : clé IA refusée';
    corps := 'OpenRouter refuse la clé du Studio : les montages échouent. Vérifiez la clé OPENROUTER_API_KEY.';
  elsif p_panne is not null or coalesce(p_credit, 0) <= 0 then
    titre := 'Studio en panne : crédit IA épuisé';
    corps := 'Les montages échouent tant que le crédit OpenRouter n''est pas rechargé (openrouter.ai, page Credits).';
  else
    titre := 'Crédit IA du Studio bas';
    corps := 'Il reste ' || replace(to_char(p_credit, 'FM999990.00'), '.', ',') || ' $ de crédit OpenRouter (alerte sous '
             || to_char(seuil, 'FM9990') || ' $). Rechargez sur openrouter.ai, page Credits, avant la panne.';
  end if;

  insert into notifications (user_id, type, title, body, link, metadata)
  select p.id, 'studio_credit', titre, corps, '/studio', jsonb_build_object('credit', p_credit, 'panne', p_panne)
    from profiles p where p.role = 'ceo';

  insert into studio_config (cle, valeur) values ('credit_alerte_le', to_jsonb(now()))
  on conflict (cle) do update set valeur = excluded.valeur;
end $$;

revoke all on function public.studio_job_cout(uuid, text, numeric, numeric, text) from public;
grant execute on function public.studio_job_cout(uuid, text, numeric, numeric, text) to anon, authenticated;

create or replace function public.studio_suivi_ia()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when not is_ceo(auth.uid()) then null else jsonb_build_object(
    'credit', studio_config_valeur('credit_ia'),
    'seuil', studio_config_valeur('credit_alerte_seuil'),
    'montages_7j', (select count(*) from studio_montages where created_at > now() - interval '7 days' and cout_ia_usd > 0),
    'depense_7j', (select round(coalesce(sum(cout_ia_usd), 0), 2) from studio_montages where updated_at > now() - interval '7 days'),
    'cout_moyen', (select round(avg(cout_ia_usd), 3) from studio_montages
                    where statut = 'termine' and updated_at > now() - interval '30 days' and cout_ia_usd > 0)
  ) end;
$$;

revoke all on function public.studio_suivi_ia() from public, anon;
grant execute on function public.studio_suivi_ia() to authenticated;
