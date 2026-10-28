-- ─────────────────────────────────────────────────────────────────────────
-- Refonte du lead scoring, étape 1 (cahier des charges de Sidali du 27/10/2026,
-- 6 décisions validées le 28/10/2026).
--
-- Le score /70 ne prédisait pas les ventes. Nouveau score sur 100 : chaque réponse
-- vaut des points fixés dans une GRILLE versionnée (scoring_grilles), et le score
-- donne une priorité d'appel A, B, C ou D selon trois seuils.
--
-- Le calcul se fait en base (scoring_calcul) : une seule source de vérité, pas de
-- copie dans le code, et une nouvelle grille s'applique sans redéploiement.
-- Le questionnaire ne change pas : l'edge function submit-scoring-quiz continue
-- d'écrire le score /70 (gardé en lecture seule 4 semaines pour comparer) ; un
-- trigger ajoute le score /100, la priorité et la version de grille utilisée.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.scoring_grilles (
  version     serial primary key,
  points      jsonb not null,          -- {"q1": {"salarie": 25, …}, …}
  seuil_a     integer not null,        -- score >= seuil_a → A
  seuil_b     integer not null,        -- score >= seuil_b → B
  seuil_c     integer not null,        -- score >= seuil_c → C, sinon D
  active      boolean not null default false,
  note        text,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  check (seuil_a > seuil_b and seuil_b > seuil_c and seuil_c > 0)
);
comment on table public.scoring_grilles is
  'Grilles du lead scoring /100 (une ligne par version). Une seule active. Historique daté : on ne modifie pas une version, on en crée une nouvelle.';
create unique index if not exists scoring_grilles_une_active on public.scoring_grilles (active) where active;

alter table public.scoring_grilles enable row level security;
drop policy if exists scoring_grilles_lecture on public.scoring_grilles;
create policy scoring_grilles_lecture on public.scoring_grilles for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('ceo', 'collaborateur')));
-- Écriture : uniquement par migration ou par les fonctions de l'admin (étape 2).

-- Version 1 : la grille du cahier des charges (partie 3), seuils 76 / 62 / 48 (partie 4).
insert into public.scoring_grilles (points, seuil_a, seuil_b, seuil_c, active, note)
select '{
  "q1": {"salarie": 25, "independant": 17, "reconversion": 14, "etudiant": 6, "sans_activite": 4},
  "q2": {"25_35": 10, "18_24": 8, "36_45": 6, "46_plus": 6},
  "q3": {"revenu_complement": 15, "quitter_emploi": 13, "subvenir_famille": 8, "nomade": 7, "hijra": 5, "halal_aligne": 4},
  "q4": {"500_1000": 20, "1000_2000": 16, "2000_3000": 12, "plus_3000": 12, "moins_500": 6},
  "q5": {"3_7h": 10, "plus_15h": 8, "7_15h": 7, "moins_3h": 3},
  "q6": {"tres_alaise": 10, "plutot_alaise": 8, "pas_toujours": 5, "pas_du_tout": 2},
  "q7": {"pret_action": 10, "curiosite": 6, "informe": 6, "deja_teste": 6}
}'::jsonb, 76, 62, 48, true, 'Cahier des charges de Sidali du 27/10/2026, données du 12 au 25/10'
where not exists (select 1 from public.scoring_grilles);

-- Score /100 et priorité d'un jeu de réponses. NULL si une réponse manque ou est inconnue.
create or replace function public.scoring_calcul(p_answers jsonb, p_version integer default null)
returns table (score integer, priorite text, version integer)
language sql stable
set search_path = public
as $$
  with g as (
    select * from scoring_grilles
    where version = coalesce(p_version, (select version from scoring_grilles where active))
  ),
  pts as (
    select count(*) filter (where q.opts ? (p_answers ->> q.qid)) as repondues,
           count(*) as questions,
           sum((q.opts ->> (p_answers ->> q.qid))::integer) as total
    from g, jsonb_each(g.points) as q(qid, opts)
  )
  select case when pts.repondues = pts.questions then pts.total::integer end,
         case when pts.repondues <> pts.questions then null
              when pts.total >= g.seuil_a then 'A'
              when pts.total >= g.seuil_b then 'B'
              when pts.total >= g.seuil_c then 'C'
              else 'D' end,
         g.version
  from g, pts
$$;
grant execute on function public.scoring_calcul(jsonb, integer) to authenticated;

alter table public.lead_scoring_responses
  add column if not exists score_100      integer check (score_100 between 0 and 100),
  add column if not exists priorite       text check (priorite in ('A', 'B', 'C', 'D')),
  add column if not exists grille_version integer references public.scoring_grilles(version);
comment on column public.lead_scoring_responses.score is 'Ancien score /70, gardé en lecture seule pendant la comparaison (4 semaines à partir du 28/10/2026).';
comment on column public.lead_scoring_responses.score_100 is 'Score /100 calculé par scoring_calcul avec la grille grille_version.';

create or replace function public.lead_scoring_appliquer_grille()
returns trigger
language plpgsql
set search_path = public
as $$
declare r record;
begin
  select * into r from scoring_calcul(new.answers);
  new.score_100 := r.score;
  new.priorite := r.priorite;
  new.grille_version := r.version;
  return new;
end;
$$;

drop trigger if exists trg_lead_scoring_appliquer_grille on public.lead_scoring_responses;
create trigger trg_lead_scoring_appliquer_grille
  before insert or update of answers on public.lead_scoring_responses
  for each row execute function public.lead_scoring_appliquer_grille();

-- Recalcul de l'historique avec la grille active (statut et setter des leads intacts :
-- seules les réponses au questionnaire sont touchées).
update public.lead_scoring_responses r
set score_100 = c.score, priorite = c.priorite, grille_version = c.version
from public.lead_scoring_responses x
cross join lateral public.scoring_calcul(x.answers) c
where x.id = r.id;

-- Vue de la page Leads : mêmes colonnes, plus le score /100, la priorité et la version.
create or replace view public.leads_enriched as
 SELECT l.id,
    l.contact_id,
    l.source,
    l.source_detail,
    l.apporteur_id,
    l.assigned_to,
    l.assigned_at,
    l.status,
    l.call_type,
    l.systeme_io_id,
    l.created_at,
    l.updated_at,
    l.raw_full_name,
    l.raw_email,
    l.raw_phone,
    l.notes,
    c.email AS contact_email,
    c.phone_normalized AS contact_phone,
    c.full_name AS contact_full_name,
    ap.full_name AS apporteur_name,
    ass.full_name AS assigned_to_name,
    contact_call.id AS contact_call_id,
    contact_call.scheduled_at AS contact_call_scheduled_at,
    contact_call.status AS contact_call_status,
    contact_call.event_type AS contact_call_event_type,
    contact_call.assigned_to AS contact_call_assigned_to,
    contact_call_host.full_name AS contact_call_assigned_to_name,
        CASE
            WHEN contact_call.id IS NOT NULL THEN true
            ELSE false
        END AS has_active_call,
        CASE l.source_detail
            WHEN 'vsl_a'::text THEN 'VSL A'::text
            WHEN 'vsl_b'::text THEN 'VSL B'::text
            WHEN 'vsl_webi'::text THEN 'VSL Webi'::text
            WHEN 'instagram_organic'::text THEN 'Instagram Organique'::text
            WHEN 'instagram_ads'::text THEN 'Instagram Ads'::text
            WHEN 'apporteur'::text THEN 'Apporteur'::text
            ELSE l.source_detail
        END AS source_label,
        CASE l.status
            WHEN 'nouveau'::text THEN 'Nouveau'::text
            WHEN 'contacte'::text THEN 'Contacté'::text
            WHEN 'pas_de_reponse'::text THEN 'Pas de réponse'::text
            WHEN 'a_relancer'::text THEN 'À relancer'::text
            WHEN 'faux_numero'::text THEN 'Faux numéro'::text
            WHEN 'qualifie'::text THEN 'Qualifié'::text
            WHEN 'pas_qualifie'::text THEN 'Pas qualifié'::text
            WHEN 'converti'::text THEN 'Converti'::text
            WHEN 'perdu'::text THEN 'Perdu'::text
            ELSE l.status
        END AS status_label,
    l.recycled_at,
    scoring.score AS quiz_score,
    scoring.category AS quiz_category,
    scoring.flags AS quiz_flags,
    scoring.completed_at AS quiz_completed_at,
    scoring.answers AS quiz_answers,
        CASE
            WHEN scoring.id IS NOT NULL THEN true
            ELSE false
        END AS quiz_filled,
    any_call.id AS any_call_id,
    any_call.scheduled_at AS any_call_scheduled_at,
    any_call.status AS any_call_status,
        CASE
            WHEN any_call.id IS NOT NULL THEN true
            ELSE false
        END AS has_any_call,
    l.auto_released_at,
    l.relance_etape,
    l.relance_derniere_le,
    l.premiere_action_le,
    attr.canal,
    attr.tunnel,
    attr.canal_precision,
    scoring.score_100 AS quiz_score_100,
    scoring.priorite AS quiz_priorite,
    scoring.grille_version AS quiz_grille_version
   FROM leads l
     LEFT JOIN contacts c ON l.contact_id = c.id
     LEFT JOIN profiles ap ON l.apporteur_id = ap.id
     LEFT JOIN profiles ass ON l.assigned_to = ass.id
     LEFT JOIN LATERAL ( SELECT calls.id,
            calls.contact_id,
            calls.lead_id,
            calls.calendly_event_id,
            calls.event_type,
            calls.scheduled_at,
            calls.duration_minutes,
            calls.assigned_to,
            calls.status,
            calls.outcome,
            calls.notes,
            calls.created_at,
            calls.updated_at,
            calls.canceled_at,
            calls.canceled_by,
            calls.cancellation_reason,
            calls.rescheduled_from,
            calls.raw_full_name,
            calls.raw_email,
            calls.raw_phone,
            calls.closer_notes
           FROM calls
          WHERE calls.contact_id = l.contact_id AND calls.status = 'planifie'::text AND calls.scheduled_at > now()
          ORDER BY calls.scheduled_at
         LIMIT 1) contact_call ON true
     LEFT JOIN profiles contact_call_host ON contact_call.assigned_to = contact_call_host.id
     LEFT JOIN LATERAL ( SELECT lsr.id,
            lsr.score,
            lsr.category,
            lsr.flags,
            lsr.completed_at,
            lsr.answers,
            lsr.score_100,
            lsr.priorite,
            lsr.grille_version
           FROM lead_scoring_responses lsr
          WHERE lower(lsr.contact_email) = lower(c.email)
          ORDER BY lsr.completed_at DESC NULLS LAST, lsr.created_at DESC
         LIMIT 1) scoring ON true
     LEFT JOIN LATERAL ( SELECT ca.id,
            ca.scheduled_at,
            ca.status
           FROM calls ca
          WHERE ca.contact_id = l.contact_id
          ORDER BY ca.scheduled_at DESC NULLS LAST, ca.created_at DESC
         LIMIT 1) any_call ON true
     LEFT JOIN LATERAL lead_attribution(l.source, l.source_detail, l.utm_source) attr(canal, tunnel, canal_precision) ON true;
