-- ─────────────────────────────────────────────────────────────────────────
-- Lead scoring sur les tunnels natifs WhatsApp et VSL (demande de Hassan le
-- 04/10/2026 : « exactement le même système » qu'avec Systeme.io).
--
-- Le quiz (7 questions, barème sur 70, src/lib/leadScoring.ts) était branché
-- sur les pages Systeme.io et s'est éteint avec elles le 15/07/2026.
--
-- Ici, seulement les deux « funnels » du quiz. Le reste ne change pas :
--   • le jeton est créé par tunnel-lead-submit à l'inscription (le site sait
--     qui vient de s'inscrire : plus besoin du rapprochement par IP de
--     match-scoring-token) ;
--   • les réponses passent par submit-scoring-quiz, inchangée ;
--   • le CRM lit le score via leads_enriched, qui rapproche par e-mail.
--
-- `thank_you_url` est obligatoire dans la table ; le site navigue lui-même
-- vers sa page de remerciement (en gardant la variante vidéo `?v=`).
-- ─────────────────────────────────────────────────────────────────────────
insert into public.quiz_funnel_configs (slug, name, thank_you_url, active)
values
  ('tunnel-wa',  'Tunnel WhatsApp (natif)', 'https://event.albarakaecosysteme.com/webinaire/merci', true),
  ('tunnel-vsl', 'Tunnel VSL (natif)',      'https://event.albarakaecosysteme.com/vsl/merci',      true)
on conflict (slug) do update
  set name = excluded.name,
      thank_you_url = excluded.thank_you_url,
      active = excluded.active;
