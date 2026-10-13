-- ─────────────────────────────────────────────────────────────────────────
-- Bibliothèque de scripts : savoir quels scripts un élève a déjà tournés
-- (Sidali, 13/10/2026). La vidéo garde le script de la bibliothèque dont elle
-- est partie : en voix off automatiquement, en face caméra si l'élève l'indique à
-- l'import (champ facultatif, décision de Hassan). Un script est « déjà tourné »
-- dès que la vidéo a été comptée (compte_le), voir l'application.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.studio_montages
  add column if not exists script_id uuid references public.studio_scripts(id) on delete set null;

create index if not exists studio_montages_script_idx
  on public.studio_montages (user_id, script_id) where script_id is not null;
