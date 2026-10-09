-- Studio de mai (b-rolls IA, 20/05/2026) : suppression (09/10/2026).
-- Le Studio est reconstruit sur le cahier des charges de Sidali du 29/09/2026.
-- Seuls le CEO et le compte test de Sidali y avaient accès (2 projets de test,
-- sauvegardés hors du repo avant suppression). Le bucket « studio » est vidé
-- et supprimé par l'API Storage, pas ici.

drop policy if exists studio_storage_owner_select on storage.objects;
drop policy if exists studio_storage_owner_insert on storage.objects;
drop policy if exists studio_storage_owner_update on storage.objects;
drop policy if exists studio_storage_owner_delete on storage.objects;
drop policy if exists studio_storage_ceo_all on storage.objects;

drop table if exists public.studio_broll_pending_jobs;
drop table if exists public.studio_render_jobs;
drop table if exists public.studio_projects;

drop function if exists public.update_studio_segment_broll(uuid, integer, text, text, integer, integer);
drop function if exists public.studio_projects_set_updated_at();

drop type if exists public.studio_project_status;
drop type if exists public.studio_project_source;
