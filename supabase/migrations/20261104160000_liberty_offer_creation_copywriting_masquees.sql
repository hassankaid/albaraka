-- 04/11/2026, demande de Sidali : les élèves Liberty ne voient plus Offer Creation ni Copywriting, les
-- formations de l'ancienne version de Liberty, dont le contenu est repris dans le nouveau parcours.
-- Même réglage que les anciennes formations du Pass AL BARAKA (12/10) : masquées aux élèves, sauf achat
-- à l'unité (aucun à ce jour). Inscriptions, progression et certificats conservés ; le CEO les voit toujours.
-- Appliqué en base le 04/11/2026.
update public.formations set masquee_eleves = true where slug in ('offer-creation', 'copywriting');
