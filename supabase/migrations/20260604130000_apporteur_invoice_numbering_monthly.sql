-- Bascule la nomenclature apporteurs sur un COMPTEUR MENSUEL (ordre de génération).
-- Remplace la version "compteur par apporteur" (migration 20260604120000).
-- Format inchangé : FACT-NNN-PRENOM-NOM-AAAAMM, mais NNN repart à 001 chaque mois
-- (tous apporteurs confondus), attribué dans l'ordre de génération (generated_at).
-- normalize_apporteur_name() reste inchangée (cf. 20260604120000).
-- Appliquée en prod le 2026-06-04 (renumérotation des 122 factures fév->mai 2026).

-- RPC pour les nouveaux cycles : NNN = (nb factures du mois) + 1
create or replace function next_apporteur_invoice_number(p_apporteur_id uuid, p_year int, p_month int)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_rank int;
  v_name text;
  v_candidate text;
begin
  -- Compteur mensuel (tous apporteurs confondus), ordre de génération
  select count(*) into v_rank
  from apporteur_invoices
  where period_year = p_year and period_month = p_month;
  v_rank := v_rank + 1;

  select coalesce(nullif(normalize_apporteur_name(full_name), ''), 'APPORTEUR')
    into v_name
  from profiles where id = p_apporteur_id;
  v_name := coalesce(v_name, 'APPORTEUR');

  -- Garde-fou unicité (rare race) : incrémente si le numéro existe déjà
  loop
    v_candidate := 'FACT-' || lpad(v_rank::text, 3, '0') || '-' || v_name || '-'
                   || p_year::text || lpad(p_month::text, 2, '0');
    exit when not exists (select 1 from apporteur_invoices where invoice_number = v_candidate);
    v_rank := v_rank + 1;
  end loop;

  return v_candidate;
end;
$$;

-- Renumérotation rétroactive : compteur mensuel par ordre de génération.
-- 2 phases (valeur temporaire puis finale) pour respecter l'index unique.
create or replace function renumber_apporteur_invoices()
returns table(id uuid, old_number text, new_number text)
language plpgsql
security definer
set search_path = public
as $$
begin
  create temp table _renum on commit drop as
  select ai.id,
         ai.invoice_number as old_num,
         ai.apporteur_id,
         'FACT-' || lpad(
            row_number() over (
              partition by ai.period_year, ai.period_month
              order by ai.generated_at, ai.id
            )::text, 3, '0')
         || '-' || coalesce(nullif(normalize_apporteur_name(p.full_name), ''), 'APPORTEUR')
         || '-' || ai.period_year::text || lpad(ai.period_month::text, 2, '0') as new_num
  from apporteur_invoices ai
  join profiles p on p.id = ai.apporteur_id;

  -- Phase 1 : valeur temporaire unique (évite collision avec l'index unique)
  update apporteur_invoices ai
  set invoice_number = 'TMP-' || ai.id::text
  from _renum r
  where ai.id = r.id;

  -- Phase 2 : valeur finale + pdf_url cohérent
  update apporteur_invoices ai
  set invoice_number = r.new_num,
      pdf_url = r.apporteur_id::text || '/' || r.new_num || '.html',
      updated_at = now()
  from _renum r
  where ai.id = r.id;

  return query select r.id, r.old_num, r.new_num from _renum r;
end;
$$;
