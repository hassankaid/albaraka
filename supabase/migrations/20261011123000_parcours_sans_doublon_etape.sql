-- Parcours Setting/Closing et Community Management : chaque partie s'affichait deux
-- fois (« ÉTAPE 0 — MUSLIM MINDSET » puis la carte « PARTIE 0 — MUSLIM MINDSET »).
-- Sidali parle de « parties » : on garde la carte, sans le titre d'étape au-dessus.
-- Appliqué en base le 11/10/2026.
update public.formation_modules m
set etape = null
from public.formations f
where f.id = m.formation_id
  and f.slug in ('parcours-setter-closer', 'parcours-community-management')
  and m.etape is not null;
