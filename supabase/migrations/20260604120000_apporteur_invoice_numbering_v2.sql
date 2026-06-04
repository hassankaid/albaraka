-- Nouvelle nomenclature factures apporteurs : FACT-NNN-PRENOM-NOM-AAAAMM
-- NNN = compteur chronologique par apporteur. Nom complet normalise.
-- Appliquee en prod le 2026-06-04 (renumerotation des 122 factures existantes
-- via select renumber_apporteur_invoices(); + edge function v85).

-- 1) Normalisation du nom (accents -> ASCII, MAJUSCULES, non-alphanum -> '-')
create or replace function normalize_apporteur_name(p_name text)
returns text
language sql
immutable
as $$
  select btrim(
    regexp_replace(
      translate(
        upper(coalesce(p_name, '')),
        'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ',
        'AAAAAACEEEEIIIINOOOOOUUUUYY'
      ),
      '[^A-Z0-9]+', '-', 'g'
    ),
    '-'
  );
$$;

-- 2) Numero pour un nouveau cycle (appele par l'edge function via RPC)
--    Rang = nb de factures de cet apporteur sur des periodes anterieures + 1.
--    Garde-fou : si collision d'homonyme, on suffixe avec 4 hex de l'apporteur_id.
create or replace function next_apporteur_invoice_number(p_apporteur_id uuid, p_year int, p_month int)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  v_rank int;
  v_name text;
  v_base text;
  v_candidate text;
begin
  select count(*) + 1 into v_rank
  from apporteur_invoices
  where apporteur_id = p_apporteur_id
    and (period_year * 100 + period_month) < (p_year * 100 + p_month);

  select coalesce(nullif(normalize_apporteur_name(full_name), ''), 'APPORTEUR')
    into v_name
  from profiles where id = p_apporteur_id;
  v_name := coalesce(v_name, 'APPORTEUR');

  v_base := 'FACT-' || lpad(v_rank::text, 3, '0') || '-' || v_name || '-'
            || p_year::text || lpad(p_month::text, 2, '0');

  v_candidate := v_base;
  if exists (
    select 1 from apporteur_invoices
    where invoice_number = v_candidate
      and not (apporteur_id = p_apporteur_id and period_year = p_year and period_month = p_month)
  ) then
    v_candidate := v_base || '-' || upper(substr(replace(p_apporteur_id::text, '-', ''), 1, 4));
  end if;

  return v_candidate;
end;
$$;

-- 3) Renumerotation retroactive de toutes les factures existantes
create or replace function renumber_apporteur_invoices()
returns table(id uuid, old_number text, new_number text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with ranked as (
    select ai.id, ai.apporteur_id, ai.invoice_number as old_num,
           ai.period_year, ai.period_month,
           coalesce(nullif(normalize_apporteur_name(p.full_name), ''), 'APPORTEUR') as nname,
           row_number() over (
             partition by ai.apporteur_id
             order by ai.period_year, ai.period_month, ai.generated_at, ai.id
           ) as rn
    from apporteur_invoices ai
    join profiles p on p.id = ai.apporteur_id
  ),
  candidate as (
    select r.*,
      'FACT-' || lpad(r.rn::text, 3, '0') || '-' || r.nname || '-'
        || r.period_year::text || lpad(r.period_month::text, 2, '0') as base_num
    from ranked r
  ),
  dedup as (
    select c.*, count(*) over (partition by c.base_num) as cnt
    from candidate c
  ),
  final as (
    select d.id, d.old_num,
      case when d.cnt > 1
           then d.base_num || '-' || upper(substr(replace(d.apporteur_id::text, '-', ''), 1, 4))
           else d.base_num end as new_num,
      d.apporteur_id
    from dedup d
  )
  update apporteur_invoices ai
  set invoice_number = f.new_num,
      pdf_url = f.apporteur_id::text || '/' || f.new_num || '.html',
      updated_at = now()
  from final f
  where ai.id = f.id
  returning f.id, f.old_num, f.new_num;
end;
$$;
