-- ═══════════════════════════════════════════════════════════════════════
-- Parcours Liberty : les modèles de Sidali que les outils remplissent
-- (16/10/2026) — contrat + CGV + annexe de garantie (outil 3), slides VSL en
-- 11 parties (outil 4), template du webinaire (outil 10).
--
-- Le fichier (Word ou PowerPoint) est gardé en base64 : l'outil le télécharge,
-- remplace les champs entre « » et rend le document à l'élève. Le contenu des
-- modèles n'est PAS dans le dépôt (public, contenu payant) : il est chargé
-- directement en base. Lecture : élèves du Pass Liberty et CEO.
-- ═══════════════════════════════════════════════════════════════════════

create table if not exists public.liberty_modeles (
  code text primary key,
  nom text not null,
  format text not null check (format in ('docx', 'pptx')),
  contenu_base64 text not null,
  mis_a_jour timestamptz not null default now()
);

comment on table public.liberty_modeles is
  'Modèles de Sidali remplis par les outils du Parcours Liberty (contrat, slides VSL, webinaire). Contenu chargé hors dépôt.';

alter table public.liberty_modeles enable row level security;

drop policy if exists liberty_modeles_lire on public.liberty_modeles;
create policy liberty_modeles_lire on public.liberty_modeles for select to authenticated
  using (
    public.is_ceo(auth.uid())
    or exists (select 1 from public.user_passes up
               where up.user_id = auth.uid() and up.pass_type = 'liberty' and up.revoked_at is null)
  );

revoke insert, update, delete on public.liberty_modeles from anon, authenticated;
