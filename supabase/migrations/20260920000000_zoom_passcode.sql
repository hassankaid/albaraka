-- Code d'accès Zoom
--
-- La salle d'attente a été retirée le 20/09/2026 et remplacée par un code.
-- Sans le code dans le message, le participant qui clique tombe sur une
-- demande de mot de passe qu'il n'a pas : il abandonne. Le code voyage donc
-- avec la fiche de la conférence, comme le lien Zoom et le groupe WhatsApp.
--
-- Laisser la colonne vide est le cas normal le jour où le lien portera le
-- code en paramètre (`?pwd=…`) : le mail n'affiche alors aucun code, et le
-- clic suffit.

alter table public.conferences add column if not exists zoom_passcode text;

comment on column public.conferences.zoom_passcode is
  'Code d''accès de la salle Zoom, affiché sous le bouton des mails du jour J. Vide si le lien porte déjà le code.';

update public.conferences
set zoom_passcode = '985102'
where conference_date >= '2026-09-20';
