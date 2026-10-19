-- ─────────────────────────────────────────────────────────────────────────
-- Parcours Liberty, après la restructuration de Sidali (16/10 et 19/10/2026).
--
-- Il a gardé un chapitre vidéo par étape et supprimé les sous-chapitres. Deux
-- effets de bord, corrigés ici à la demande de Hassan (19/10/2026) :
--   1. le chapitre de l'outil 11 (mid-ticket / low-ticket) avait disparu du Bonus :
--      il revient juste après la vidéo « L'utilité des mid et low ticket » ;
--   2. 14 ressources du zip de Sidali (étapes 10 et 14 à 19) étaient rattachées
--      aux chapitres supprimés : les fichiers sont toujours dans le stockage, on
--      les rattache au chapitre vidéo de leur étape (rien à redéposer, la lecture
--      du stockage ne dépend pas du chapitre).
-- Idempotent : rien n'est ajouté deux fois.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  v_f uuid := (select id from public.formations where slug = 'parcours-liberty');
  v_bonus uuid;
  v_chap uuid;
  r record;
begin
  if v_f is null then
    return;
  end if;

  -- ── 1. Outil 11 ─────────────────────────────────────────────────────────
  select id into v_bonus from public.formation_modules where formation_id = v_f and etape = 'BONUS' order by ordre limit 1;
  if v_bonus is not null and not exists (
    select 1 from public.formation_chapitres c join public.formation_modules m on m.id = c.module_id
     where m.formation_id = v_f and c.outil = 'liberty_mid_low'
  ) then
    insert into public.formation_chapitres (module_id, titre, description, ordre, status, outil, sans_video)
    values (v_bonus, 'Outil 11 — Mes offres mid et low-ticket', 'Ce que vous remplissez :
• Mid-ticket : le contenu gardé, la durée d''accès, le prix
• Low-ticket : le format, le problème réglé, le titre, le plan des chapitres, le prix
• Votre page de vente, section par section
• Vos 5 e-mails de bienvenue

Ce que vous obtenez : Vos deux fiches offres, le texte de votre page de vente et vos 5 e-mails, en PDF ou Word.',
            coalesce((select max(ordre) + 1 from public.formation_chapitres where module_id = v_bonus), 0),
            'published', 'liberty_mid_low', true);
  end if;

  -- ── 2. Ressources orphelines → chapitre vidéo de leur étape ─────────────
  for r in
    select * from (values
      (10, 'Banque d''accroches',           'e825f657', 'e0e22b24-Banque-d-accroches.pdf'),
      (10, 'Structures d''écriture',        'e825f657', '81098f77-Structures-d-ecriture.pdf'),
      (10, 'Mots qui vendent',              'e825f657', 'acc3901f-Mots-qui-vendent.pdf'),
      (10, 'Règles de relecture',           'e825f657', '71717036-Regles-de-relecture.pdf'),
      (10, 'Prompts Claude',                'e825f657', '6871a9bb-Prompts-Claude.pdf'),
      (14, 'Suivi de coaching',             '9290825b', 'b58d8f69-Suivi-de-coaching.docx'),
      (15, 'Kit témoignage',                '270c4f25', 'a6e2a014-Kit-temoignage.pdf'),
      (15, 'Autorisation de témoignage',    '270c4f25', 'a0a2a21e-Autorisation-de-temoignage.docx'),
      (16, 'Checklist de transition',       '50c522eb', 'b0919c16-Checklist-de-transition.pdf'),
      (17, 'Plan du programme V1',          'd3896ffb', '19a5021e-Plan-du-programme-V1.docx'),
      (17, 'Support vidéo',                 '1795244c', 'aad1c5d3-Support-video.pptx'),
      (18, 'Script de prévente',            '99e86b12', '6ae956d0-Script-de-prevente.docx'),
      (19, 'Template webinaire Liberty',    'b2e943af', '4c34f484-Template-webinaire-Liberty.pptx'),
      (19, 'Guide du template webinaire',   'b2e943af', 'bcc5ff82-Guide-du-template-webinaire.pdf')
    ) as t(etape_ordre, titre, prefixe, fichier)
  loop
    -- le chapitre vidéo de l'étape (le premier, hors outil)
    select c.id into v_chap
      from public.formation_chapitres c join public.formation_modules m on m.id = c.module_id
     where m.formation_id = v_f and m.ordre = r.etape_ordre and c.outil is null
     order by c.ordre limit 1;
    if v_chap is null then
      continue;
    end if;
    insert into public.chapitre_ressources (chapitre_id, titre, type, url, ordre)
    select v_chap, r.titre, 'fichier', 'stockage:' || o.name,
           coalesce((select max(ordre) + 1 from public.chapitre_ressources where chapitre_id = v_chap and video_id is null), 0)
      from storage.objects o
     where o.bucket_id = 'formation-resources'
       and o.name like r.prefixe || '%/' || r.fichier
       and not exists (select 1 from public.chapitre_ressources x where x.url = 'stockage:' || o.name);
  end loop;
end $$;
