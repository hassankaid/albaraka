-- ─────────────────────────────────────────────────────────────────────────
-- Renvois entre chapitres.
--
-- Demande de Hassan le 28/09/2026 : pouvoir dire à l'élève, à un endroit
-- précis d'une formation, « pour aller plus loin, va sur tel chapitre ».
--
-- Un renvoi part d'un chapitre — de tout le chapitre, ou d'une vidéo précise
-- (« à ce stade-là ») — et mène à un chapitre de N'IMPORTE QUELLE formation,
-- éventuellement à une vidéo précise. Une phrase libre facultative l'introduit.
-- Pas de catégories d'intention pour l'instant (écartées par Hassan, peut-être
-- plus tard).
--
-- ⚠️ UN RENVOI N'EST PAS UNE PORTE DÉROBÉE. La base interdit déjà à un élève
-- de lire un chapitre d'une formation où il n'est pas inscrit
-- (`chapitres_select_enrolled`). Le renvoi vers une telle formation est
-- montré VERROUILLÉ (choix de Hassan) : `renvois_du_chapitre` en livre les
-- TITRES — formation, module, chapitre, vidéo — et rien d'autre. Le contenu
-- reste derrière la politique existante, que ce renvoi ne touche pas.
--
-- Titres toujours à jour : on stocke des identifiants, jamais des libellés.
-- Un chapitre renommé ou déplacé ne casse aucun renvoi ; un chapitre supprimé
-- emporte ses renvois ; une vidéo cible supprimée ramène le renvoi au chapitre.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.chapitre_renvois (
  id                uuid primary key default gen_random_uuid(),
  -- D'où part le renvoi.
  chapitre_id       uuid not null references public.formation_chapitres(id) on delete cascade,
  -- NULL : tout le chapitre. Sinon : affiché sous cette vidéo.
  video_id          uuid references public.chapitre_videos(id) on delete cascade,
  -- Où il mène.
  cible_chapitre_id uuid not null references public.formation_chapitres(id) on delete cascade,
  -- NULL : le chapitre, sur sa première vidéo. Supprimée : retour au chapitre.
  cible_video_id    uuid references public.chapitre_videos(id) on delete set null,
  message           text check (message is null or length(btrim(message)) between 1 and 280),
  ordre             integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- Renvoyer vers son propre chapitre n'a de sens que vers une AUTRE vidéo.
-- Contrôlé à la CRÉATION seulement (déclencheur ci-dessous), pas par une
-- contrainte : si cette vidéo est supprimée, `on delete set null` ramène la
-- cible au chapitre lui-même, et une contrainte refuserait cette mise à jour —
-- donc la suppression de la vidéo. Ces renvois devenus vides sont ignorés à
-- la lecture.

comment on table public.chapitre_renvois is
  'Renvois « pour aller plus loin » d''un chapitre (ou d''une de ses vidéos) vers un autre chapitre, toutes formations confondues. Écriture CEO ; lecture élève via renvois_du_chapitre().';

create index if not exists chapitre_renvois_source on public.chapitre_renvois (chapitre_id, ordre);
create index if not exists chapitre_renvois_cible on public.chapitre_renvois (cible_chapitre_id);

-- Une vidéo désignée doit appartenir au chapitre désigné, des deux côtés.
-- Une clé étrangère ne sait pas l'exprimer ; sans ce contrôle, un renvoi
-- pourrait s'afficher sous une vidéo d'un autre chapitre, ou ouvrir la mauvaise.
create or replace function public.chapitre_renvois_verifier()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.cible_chapitre_id = new.chapitre_id and new.cible_video_id is null then
    raise exception 'un renvoi vers son propre chapitre doit viser une autre video';
  end if;
  if new.video_id is not null and not exists (
    select 1 from chapitre_videos v where v.id = new.video_id and v.chapitre_id = new.chapitre_id
  ) then
    raise exception 'la video de depart n''appartient pas au chapitre de depart';
  end if;
  if new.cible_video_id is not null and not exists (
    select 1 from chapitre_videos v where v.id = new.cible_video_id and v.chapitre_id = new.cible_chapitre_id
  ) then
    raise exception 'la video cible n''appartient pas au chapitre cible';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists chapitre_renvois_verifier on public.chapitre_renvois;
create trigger chapitre_renvois_verifier
  before insert or update on public.chapitre_renvois
  for each row execute function public.chapitre_renvois_verifier();

alter table public.chapitre_renvois enable row level security;

-- Écriture et lecture brute : CEO seulement. Les élèves passent par la
-- fonction ci-dessous, qui décide de ce qu'ils ont le droit de voir.
drop policy if exists chapitre_renvois_ceo on public.chapitre_renvois;
create policy chapitre_renvois_ceo on public.chapitre_renvois
  for all to authenticated
  using (is_ceo(auth.uid()))
  with check (is_ceo(auth.uid()));

grant select, insert, update, delete on public.chapitre_renvois to authenticated;

-- ── Lecture élève ─────────────────────────────────────────────────────────
--
-- Les renvois d'un chapitre, avec les titres de la cible et un indicateur
-- `accessible`. Règles :
--   - rien si l'appelant ne peut pas lui-même voir le chapitre de départ ;
--   - seulement des cibles PUBLIÉES (chapitre, module, formation) — sauf pour
--     le CEO, qui voit tout, avec `cible_publiee` pour le repérer ;
--   - `accessible` = l'élève est inscrit à la formation cible, exactement la
--     condition de la politique qui protège le contenu.

create or replace function public.renvois_du_chapitre(p_chapitre uuid)
returns table (
  id uuid,
  video_id uuid,
  message text,
  ordre integer,
  cible_chapitre_id uuid,
  cible_video_id uuid,
  cible_chapitre_titre text,
  cible_video_titre text,
  cible_module_titre text,
  cible_formation_slug text,
  cible_formation_titre text,
  meme_formation boolean,
  accessible boolean,
  cible_publiee boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with appelant as (
    select auth.uid() as uid, is_ceo(auth.uid()) as ceo
  ),
  depart as (
    select c.id, m.formation_id
    from formation_chapitres c
    join formation_modules m on m.id = c.module_id
    join formations f on f.id = m.formation_id, appelant a
    where c.id = p_chapitre
      and (
        a.ceo
        or (c.status = 'published' and m.status = 'published' and f.status = 'published'
            and has_formation_enrollment(a.uid, f.id))
      )
  )
  select
    r.id,
    r.video_id,
    r.message,
    r.ordre,
    r.cible_chapitre_id,
    r.cible_video_id,
    c.titre,
    v.titre,
    m.titre,
    f.slug,
    f.titre,
    f.id = d.formation_id,
    a.ceo or has_formation_enrollment(a.uid, f.id),
    (c.status = 'published' and m.status = 'published' and f.status = 'published')
  from chapitre_renvois r
  join depart d on d.id = r.chapitre_id
  join formation_chapitres c on c.id = r.cible_chapitre_id
  join formation_modules m on m.id = c.module_id
  join formations f on f.id = m.formation_id
  left join chapitre_videos v on v.id = r.cible_video_id
  cross join appelant a
  where (a.ceo or (c.status = 'published' and m.status = 'published' and f.status = 'published'))
    -- Renvoi vers son propre chapitre dont la vidéo cible a disparu : vide.
    and not (r.cible_chapitre_id = r.chapitre_id and r.cible_video_id is null)
  order by r.video_id nulls first, r.ordre, r.created_at;
$$;

revoke all on function public.renvois_du_chapitre(uuid) from public, anon;
grant execute on function public.renvois_du_chapitre(uuid) to authenticated;
