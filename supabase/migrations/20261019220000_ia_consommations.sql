-- ─────────────────────────────────────────────────────────────────────────
-- Consommation IA de la plateforme (décisions de Hassan, 19/10/2026).
--
-- Toute l'IA passe désormais par OpenRouter (une seule clé, un seul crédit). Chaque
-- appel est noté dans ia_consommations : qui, quelle fonctionnalité, quel modèle,
-- combien de tokens, combien de dollars. C'est la source du tableau de bord
-- « Consommation IA » et des colonnes du « Suivi Élèves ». Réservé au CEO.
--
-- Qui écrit :
-- - les edge functions (clé de service, module _shared/ia.ts) ;
-- - le Studio : studio_job_cout (montages) et la fin des tâches de la banque (trigger) ;
-- - la fonction Vercel du thème du Studio : ia_noter (droits de l'utilisateur).
-- Les montages et indexations d'avant sont repris, marqués « reprise ».
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.ia_consommations (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  fonctionnalite text not null,
  modele text,
  tokens_entree integer,
  tokens_sortie integer,
  cout_usd numeric(12, 6) not null default 0,
  -- montage, tâche de la banque… : pour retrouver d'où vient la dépense
  reference text,
  statut text not null default 'ok' check (statut in ('ok', 'erreur', 'reprise'))
);

comment on table public.ia_consommations is
  'Journal des appels à l''IA (OpenRouter) : utilisateur, fonctionnalité, modèle, tokens, coût. Lecture : CEO seulement.';

create index if not exists ia_consommations_date_idx on public.ia_consommations (cree_le desc);
create index if not exists ia_consommations_user_idx on public.ia_consommations (user_id, cree_le desc);
create index if not exists ia_consommations_fonction_idx on public.ia_consommations (fonctionnalite, cree_le desc);

alter table public.ia_consommations enable row level security;

drop policy if exists ia_consommations_ceo on public.ia_consommations;
create policy ia_consommations_ceo on public.ia_consommations
  for select using (public.is_ceo(auth.uid()));

revoke insert, update, delete on public.ia_consommations from anon, authenticated;

-- ── écriture depuis le navigateur ou Vercel, au nom de l'utilisateur connecté ──
create or replace function public.ia_noter(
  p_fonctionnalite text, p_modele text, p_tokens_entree integer, p_tokens_sortie integer, p_cout numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_fonctionnalite not in ('studio_theme') then
    return;
  end if;
  insert into ia_consommations (user_id, fonctionnalite, modele, tokens_entree, tokens_sortie, cout_usd)
  values (auth.uid(), p_fonctionnalite, left(p_modele, 80), p_tokens_entree, p_tokens_sortie,
          greatest(0, least(coalesce(p_cout, 0), 1)));
end $$;

revoke all on function public.ia_noter(text, text, integer, integer, numeric) from public, anon;
grant execute on function public.ia_noter(text, text, integer, integer, numeric) to authenticated;

-- ── Studio : chaque déclaration de coût d'un montage va aussi au journal ──
create or replace function public.studio_job_cout(
  p_id uuid, p_jeton text, p_cout numeric, p_credit numeric default null, p_panne text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m studio_montages;
  cout numeric := greatest(0, least(coalesce(p_cout, 0), 5));
  seuil numeric := coalesce((studio_config_valeur('credit_alerte_seuil'))::text::numeric, 10);
  derniere timestamptz := (studio_config_valeur('credit_alerte_le') #>> '{}')::timestamptz;
  titre text;
  corps text;
begin
  m := _studio_job(p_id, p_jeton);
  insert into studio_montages_couts (montage_id, cout_ia_usd)
  values (p_id, cout)
  on conflict (montage_id) do update
    set cout_ia_usd = studio_montages_couts.cout_ia_usd + excluded.cout_ia_usd, updated_at = now();
  if cout > 0 then
    insert into ia_consommations (user_id, fonctionnalite, modele, cout_usd, reference, statut)
    values (m.user_id, case when m.outil = 'voix_off' then 'studio_voix_off' else 'studio_face_camera' end,
            'anthropic/claude-sonnet-5.5', cout, 'montage:' || p_id,
            case when p_panne is null then 'ok' else 'erreur' end);
  end if;

  if p_credit is not null then
    insert into studio_config (cle, valeur)
    values ('credit_ia', jsonb_build_object('reste', round(p_credit, 2), 'mesure_le', now()))
    on conflict (cle) do update set valeur = excluded.valeur;
  end if;

  if p_panne is null and (p_credit is null or p_credit >= seuil) then
    return;
  end if;
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
  select p.id, 'studio_credit', titre, corps, '/admin/ia', jsonb_build_object('credit', p_credit, 'panne', p_panne)
    from profiles p where p.role = 'ceo';

  insert into studio_config (cle, valeur) values ('credit_alerte_le', to_jsonb(now()))
  on conflict (cle) do update set valeur = excluded.valeur;
end $$;

-- ── Studio, banque : une tâche d'indexation terminée va au journal ──
create or replace function public.ia_noter_tache_banque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cout numeric := coalesce((new.rapport->'cout_usd'->>'ia')::numeric, 0) + coalesce((new.rapport->'cout_usd'->>'vecteurs')::numeric, 0);
begin
  if new.statut in ('termine', 'erreur') and old.statut is distinct from new.statut and cout > 0 then
    insert into ia_consommations (user_id, fonctionnalite, modele, cout_usd, reference, statut)
    values (new.lance_par, 'studio_banque', 'anthropic/claude-sonnet-5.5', cout, 'banque:' || new.id,
            case when new.statut = 'termine' then 'ok' else 'erreur' end);
  end if;
  return new;
end $$;

drop trigger if exists ia_noter_tache_banque on public.studio_banque_jobs;
create trigger ia_noter_tache_banque
  after update of statut on public.studio_banque_jobs
  for each row execute function public.ia_noter_tache_banque();

-- ── reprise de l'historique connu (Studio seulement : le reste n'était pas mesuré) ──
insert into public.ia_consommations (cree_le, user_id, fonctionnalite, modele, cout_usd, reference, statut)
select m.updated_at, m.user_id,
       case when m.outil = 'voix_off' then 'studio_voix_off' else 'studio_face_camera' end,
       'anthropic/claude-sonnet-5.5', c.cout_ia_usd, 'montage:' || m.id, 'reprise'
  from public.studio_montages_couts c join public.studio_montages m on m.id = c.montage_id
 where c.cout_ia_usd > 0
   and not exists (select 1 from public.ia_consommations x where x.reference = 'montage:' || m.id);

insert into public.ia_consommations (cree_le, user_id, fonctionnalite, modele, cout_usd, reference, statut)
select j.created_at, j.lance_par, 'studio_banque', 'anthropic/claude-sonnet-5.5',
       coalesce((j.rapport->'cout_usd'->>'ia')::numeric, 0) + coalesce((j.rapport->'cout_usd'->>'vecteurs')::numeric, 0),
       'banque:' || j.id, 'reprise'
  from public.studio_banque_jobs j
 where j.rapport ? 'cout_usd'
   and not exists (select 1 from public.ia_consommations x where x.reference = 'banque:' || j.id);
