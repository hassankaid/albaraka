-- Pages sans vidéo (Parcours Liberty, 16/10/2026) : la page d'un outil, la slide de
-- validation (WhatsApp ou consulting) et une page de ressources n'auront jamais de
-- vidéo. Sans ce marqueur, le lecteur affiche l'encart « Vidéo à venir ».
alter table public.formation_chapitres
  add column if not exists sans_video boolean not null default false;
comment on column public.formation_chapitres.sans_video is
  'Page sans vidéo (outil, validation, ressources) : pas d''encart « Vidéo à venir ».';

update public.formation_chapitres c
   set sans_video = true
  from public.formation_modules m
  join public.formations f on f.id = m.formation_id
 where m.id = c.module_id and f.slug = 'parcours-liberty'
   and (c.outil is not null or c.titre like 'Validation — %' or c.titre = 'Vos ressources d''écriture');
