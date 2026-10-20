-- ─────────────────────────────────────────────────────────────────────────
-- Journal des activations d'accès (panne du 20/10/2026 : sur 7 jours, 40 liens
-- d'activation ouverts pour 13 mots de passe enregistrés ; le bouton « Activer mon
-- accès » tournait sans fin). La page note chaque essai : réussite ou échec, étape,
-- durée, navigateur. Lecture : CEO seulement. Écriture : uniquement par
-- activation_noter (appelable sans être connecté, champs bornés, débit limité).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.activation_journal (
  id uuid primary key default gen_random_uuid(),
  cree_le timestamptz not null default now(),
  utilisateur uuid,
  etape text not null,
  succes boolean not null,
  detail text,
  duree_ms integer,
  navigateur text
);

comment on table public.activation_journal is
  'Essais d''activation de l''accès (page /reset-password) : réussite, étape, durée, navigateur. Lecture CEO.';

create index if not exists activation_journal_date_idx on public.activation_journal (cree_le desc);

alter table public.activation_journal enable row level security;

drop policy if exists activation_journal_ceo on public.activation_journal;
create policy activation_journal_ceo on public.activation_journal
  for select using (public.is_ceo(auth.uid()));

revoke insert, update, delete on public.activation_journal from anon, authenticated;

create or replace function public.activation_noter(
  p_etape text, p_succes boolean, p_detail text default null, p_duree_ms integer default null,
  p_navigateur text default null, p_utilisateur uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- garde-fou : un journal, pas une porte ouverte (au plus 300 lignes par heure)
  if (select count(*) from activation_journal where cree_le > now() - interval '1 hour') >= 300 then
    return;
  end if;
  insert into activation_journal (utilisateur, etape, succes, detail, duree_ms, navigateur)
  values (p_utilisateur, left(coalesce(p_etape, '?'), 40), coalesce(p_succes, false), left(p_detail, 300),
          least(greatest(coalesce(p_duree_ms, 0), 0), 3600000), left(p_navigateur, 60));
end $$;

revoke all on function public.activation_noter(text, boolean, text, integer, text, uuid) from public;
grant execute on function public.activation_noter(text, boolean, text, integer, text, uuid) to anon, authenticated;
