-- ═══════════════════════════════════════════════════════════════════════
-- Un commercial desactive ne recoit plus de fiches, et les siennes a traiter
-- retournent dans les leads a traiter.
--
-- LE PROBLEME, REMONTE PAR L'EQUIPE COMMERCIALE. Quand une personne revient, le
-- declencheur `trg_auto_assign_new_lead` donne sa nouvelle fiche au commercial
-- qui avait traite la precedente — sans regarder s'il travaille encore. Depuis
-- le 1er aout, 20 personnes revenues (32 fiches) sont ainsi tombees chez Riyad,
-- Cintia, Manoubi, Amira ou Laila, tous desactives. Leurs fiches restaient la,
-- hors de la file « leads a traiter », et personne ne les rappelait.
--
-- LE CRITERE EXISTAIT DEJA, SEUL L'HERITAGE L'IGNORAIT. `profiles.is_active`,
-- que le CEO bascule depuis la page Equipe, est respecte par le menu
-- d'affectation manuelle, par `dispatch_lead_to` (« Utilisateur cible
-- introuvable ou inactif »), par les rappels d'activite et par l'ecran de
-- connexion. Ce declencheur etait le seul chemin d'affectation qui ne le
-- verifiait pas. On l'aligne ; on n'invente aucun critere nouveau.
--
-- LE NETTOYAGE MANUEL NE POUVAIT PAS SUFFIRE. L'heritage s'appuie sur
-- N'IMPORTE QUELLE ancienne fiche du contact, y compris « perdu » et
-- « pas qualifie ». 1 049 fiches cloturees (perdu, pas qualifie, faux numero,
-- close) portent encore le nom d'un inactif : chacune de ces personnes, en
-- revenant, retombait chez lui. Vider les fiches ouvertes ne changeait rien a
-- ce stock.
--
-- LA REGLE EST STRICTE : si le DERNIER commercial du contact est desactive, la
-- personne part dans les leads a traiter. On ne remonte pas vers un commercial
-- plus ancien. Mesure : sur 1 178 contacts dont le dernier commercial est
-- inactif, 19 seulement avaient ete traites avant par quelqu'un d'actif.
--
-- LES FICHES CLOTUREES NE SONT PAS TOUCHEES : le nom du commercial qui les a
-- traitees fait partie de l'historique et des commissions. Les fiches plus
-- avancees (inscrit_conference, call_booke) restent aussi chez leur titulaire
-- inactif — decision de la direction du 10/09/2026.
-- ═══════════════════════════════════════════════════════════════════════

-- ── 1. L'heritage ignore les personnes desactivees ──────────────────────
create or replace function public.auto_assign_new_lead_to_contact_collab()
 returns trigger
 language plpgsql
as $function$
declare
  v_dernier         uuid;
  v_dernier_actif   boolean;
  v_existing_assignee uuid;
  v_has_recycled    boolean;
  v_inherit_source  text;
begin
  if new.assigned_to is not null then
    return new;
  end if;

  -- Regle 1 : le commercial de la fiche la plus recente du contact.
  -- Un profil introuvable compte comme inactif : on n'affecte pas a un fantome.
  select l.assigned_to, coalesce(p.is_active, false)
    into v_dernier, v_dernier_actif
  from leads l
  left join profiles p on p.id = l.assigned_to
  where l.contact_id = new.contact_id
    and l.assigned_to is not null
    and l.recycled_at is null
  order by l.assigned_at desc nulls last, l.created_at desc
  limit 1;

  if v_dernier is not null then
    -- Actif : on garde la continuite. Inactif : la personne part dans les leads
    -- a traiter, et on ne consulte PAS les appels — ils servent aux contacts
    -- qui n'ont jamais eu de commercial, pas a contourner un desactive.
    if v_dernier_actif then
      new.assigned_to := v_dernier;
      new.assigned_at := now();
      v_inherit_source := 'lead';
    end if;
  else
    -- Regle 2 : reset volontaire detecte -> ne pas heriter du call
    select exists(
      select 1 from leads
      where contact_id = new.contact_id and recycled_at is not null
    ) into v_has_recycled;

    if not v_has_recycled then
      -- Regle 3 : l'hote du dernier appel non annule, s'il est actif.
      select k.assigned_to into v_existing_assignee
      from calls k
      join profiles p on p.id = k.assigned_to and p.is_active
      where k.contact_id = new.contact_id
        and k.assigned_to is not null
        and k.status is distinct from 'cancelled'
      order by k.scheduled_at desc nulls last, k.created_at desc
      limit 1;

      if v_existing_assignee is not null then
        new.assigned_to := v_existing_assignee;
        new.assigned_at := now();
        v_inherit_source := 'call';
      end if;
    end if;
  end if;

  -- Regle 4 (depuis le 2026-05-18) : lead apporte et toujours sans titulaire
  -- -> l'apporteur, s'il est actif. Le cron hebdomadaire le liberera vers le
  -- pool s'il reste 'a_qualifier' apres sa semaine.
  if new.assigned_to is null
     and new.apporteur_id is not null
     and now() >= timestamptz '2026-05-18 00:00:00+02'
     and exists (select 1 from profiles p where p.id = new.apporteur_id and p.is_active) then
    new.assigned_to := new.apporteur_id;
    new.assigned_at := now();
    v_inherit_source := 'apporteur';
  end if;

  if new.assigned_to is not null and v_inherit_source is not null then
    perform set_config(
      'app.auto_assign_inherit_source',
      new.id::text || ':' || v_inherit_source,
      true
    );
  end if;

  return new;
end;
$function$;

-- ── 2. Remettre les fiches a traiter d'un commercial dans le pot commun ──
--
-- Seules les fiches encore a traiter partent : a_qualifier, nouveau, a_relancer.
-- `recycled_at` reste NULL : ces fiches doivent arriver dans « leads a traiter »,
-- pas dans « a recycler ».
--
-- SECURITY DEFINER pour agir malgre la RLS quand le declencheur s'execute sous
-- la session du CEO. Garde-fou en consequence : hors contexte systeme
-- (auth.uid() nul : cron, service), seul le CEO peut l'appeler — sinon n'importe
-- quel utilisateur connecte pourrait vider la file d'un collegue.
create or replace function public.liberer_fiches_a_traiter(p_user_id uuid, p_motif text default null)
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_auteur uuid;
  v_note   text := coalesce(nullif(p_motif, ''),
                            'Commercial desactive : fiche remise dans les leads a traiter');
  v_nb     integer := 0;
  r        record;
begin
  if auth.uid() is not null and coalesce(get_user_role(), '') <> 'ceo' then
    raise exception 'Seul le CEO peut remettre les fiches d''un commercial dans le pot commun';
  end if;

  -- lead_activities.user_id est obligatoire. Les actions systeme sont signees du
  -- CEO, comme le fait deja recycle-stale-leads.
  v_auteur := coalesce(
    auth.uid(),
    (select id from profiles where role = 'ceo' order by created_at limit 1),
    p_user_id
  );

  for r in
    select id from leads
    where assigned_to = p_user_id
      and status in ('a_qualifier', 'nouveau', 'a_relancer')
    for update
  loop
    update leads set assigned_to = null, assigned_at = null where id = r.id;

    insert into lead_activities (lead_id, user_id, action, old_value, new_value, note)
    values (r.id, v_auteur, 'unassigned', p_user_id::text, null, v_note);

    v_nb := v_nb + 1;
  end loop;

  return v_nb;
end;
$function$;

revoke all on function public.liberer_fiches_a_traiter(uuid, text) from public, anon;
grant execute on function public.liberer_fiches_a_traiter(uuid, text) to authenticated, service_role;

-- ── 3. Desactiver un commercial libere automatiquement ses fiches a traiter ──
--
-- Jusqu'ici, desactiver quelqu'un depuis la page Equipe ne liberait rien : ses
-- fiches restaient chez lui. C'est ainsi que six personnes desactivees
-- detenaient 94 fiches a traiter au 10/09/2026.
create or replace function public.tg_liberer_fiches_si_desactive()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  perform public.liberer_fiches_a_traiter(new.id);
  return null;
end;
$function$;

drop trigger if exists trg_liberer_fiches_si_desactive on public.profiles;
create trigger trg_liberer_fiches_si_desactive
  after update of is_active on public.profiles
  for each row
  when (old.is_active is true and new.is_active is false)
  execute function public.tg_liberer_fiches_si_desactive();

-- ═══════════════════════════════════════════════════════════════════════
-- RETOUR ARRIERE, si besoin. Ancienne regle 1 (sans verification d'activite) :
--
--   SELECT assigned_to INTO v_existing_assignee
--   FROM leads
--   WHERE contact_id = NEW.contact_id
--     AND assigned_to IS NOT NULL
--     AND recycled_at IS NULL
--   ORDER BY assigned_at DESC NULLS LAST, created_at DESC
--   LIMIT 1;
--
-- Les regles 3 et 4 n'avaient pas non plus le filtre `is_active`. Supprimer le
-- declencheur de desactivation :
--   drop trigger if exists trg_liberer_fiches_si_desactive on public.profiles;
-- ═══════════════════════════════════════════════════════════════════════
