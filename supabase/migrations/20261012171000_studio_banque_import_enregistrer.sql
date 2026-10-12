-- Studio, Voix off : un job d'import enregistre ses fichiers (vidéos et sons), une fois
-- déposés dans le bucket studio-banque. Seuls les fichiers réellement présents sous
-- originaux/ ou sons/ sont acceptés ; un fichier déjà connu (même empreinte) est ignoré.
-- Les jobs d'import sont créés par le CEO (jeton à usage unique) et clos par studio_banque_job_terminer.

create or replace function public.studio_banque_import_enregistrer(
  p_job uuid, p_jeton text, p_videos jsonb default '[]', p_sons jsonb default '[]')
returns jsonb
language plpgsql security definer set search_path = public, extensions
as $$
declare
  j studio_banque_jobs := public._studio_banque_job(p_job, p_jeton);
  x jsonb;
  nv integer := 0;
  ns integer := 0;
  n integer;
begin
  if j.type <> 'import' then
    raise exception 'Job d''import attendu';
  end if;
  for x in select * from jsonb_array_elements(coalesce(p_videos, '[]')) loop
    if x->>'chemin' !~ '^originaux/[0-9a-f]{64}\.[a-z0-9]{2,4}$'
       or not exists (select 1 from storage.objects where bucket_id = 'studio-banque' and name = x->>'chemin') then
      raise exception 'Fichier absent : %', x->>'chemin';
    end if;
    insert into studio_banque_videos (origine, dossier, nom, chemin_original, empreinte, ajoutee_par)
    values ('drive', left(x->>'dossier', 120), left(x->>'nom', 200), x->>'chemin', x->>'empreinte', null)
    on conflict (empreinte) do nothing;
    get diagnostics n = row_count;
    nv := nv + n;
  end loop;
  for x in select * from jsonb_array_elements(coalesce(p_sons, '[]')) loop
    if x->>'chemin' !~ '^sons/[0-9a-f]{64}\.[a-z0-9]{2,4}$'
       or not exists (select 1 from storage.objects where bucket_id = 'studio-banque' and name = x->>'chemin') then
      raise exception 'Fichier absent : %', x->>'chemin';
    end if;
    insert into studio_sons (categorie, nom, chemin, empreinte, duree)
    values (x->>'categorie', left(x->>'nom', 200), x->>'chemin', x->>'empreinte', (x->>'duree')::numeric)
    on conflict (empreinte) do nothing;
    get diagnostics n = row_count;
    ns := ns + n;
  end loop;
  return jsonb_build_object('videos', nv, 'sons', ns);
end $$;

grant execute on function public.studio_banque_import_enregistrer(uuid, text, jsonb, jsonb) to anon, authenticated;
