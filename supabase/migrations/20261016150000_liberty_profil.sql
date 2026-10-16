-- ═══════════════════════════════════════════════════════════════════════
-- Parcours Liberty — phase 2 : le profil partagé des 11 outils (cahier des
-- charges « Outils du Parcours Liberty » de Sidali, 15/10/2026).
--
-- « La plateforme garde tout ce que l'élève remplit, dans un profil unique lié
-- à son compte. Chaque outil récupère les informations des outils précédents. »
--
-- Un seul document par élève : chaque information a une clé (« avatar.peur »,
-- « promesse.delai »…) et se lit et s'écrit à la même place depuis tous les outils.
-- Corriger une information dans un outil la corrige donc partout. La garantie
-- (écrite dans l'outil 3) est en lecture seule ailleurs : c'est l'interface qui
-- la verrouille.
--
-- Sauvegarde à chaque champ : liberty_profil_ecrire fusionne uniquement les clés
-- envoyées, sans écraser ce qu'un autre appareil vient d'enregistrer ailleurs.
-- Table distincte de liberty_user_profile (anciens outils M1 à M18) : la reprise
-- de ces anciennes données se fera à l'ouverture (phase 6).
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.liberty_profil (
  user_id uuid primary key references auth.users(id) on delete cascade,
  donnees jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.liberty_profil is
  'Parcours Liberty : tout ce que l''élève remplit dans les 11 outils, une clé par information, partagé entre les outils.';

alter table public.liberty_profil enable row level security;

drop policy if exists liberty_profil_lire on public.liberty_profil;
create policy liberty_profil_lire on public.liberty_profil for select to authenticated
  using (user_id = auth.uid() or public.is_ceo(auth.uid()));

-- aucune écriture directe : seulement par liberty_profil_ecrire
revoke insert, update, delete on public.liberty_profil from anon, authenticated;

create or replace function public.liberty_profil_ecrire(p_valeurs jsonb)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_quand timestamptz := now();
begin
  if v_user is null then
    raise exception 'Non authentifié';
  end if;
  if jsonb_typeof(p_valeurs) <> 'object' then
    raise exception 'Valeurs invalides';
  end if;
  if pg_column_size(p_valeurs) > 512 * 1024 then
    raise exception 'Trop de texte d''un coup';
  end if;

  insert into public.liberty_profil (user_id, donnees, updated_at)
  values (v_user, p_valeurs, v_quand)
  on conflict (user_id) do update
    set donnees = public.liberty_profil.donnees || excluded.donnees,
        updated_at = v_quand;

  return v_quand;
end;
$$;

revoke all on function public.liberty_profil_ecrire(jsonb) from public, anon;
grant execute on function public.liberty_profil_ecrire(jsonb) to authenticated;
