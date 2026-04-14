-- Trigger : quand on supprime une annonce, on supprime aussi les notifications
-- qui lui sont associées (référencées via metadata->>'announcement_id').
create or replace function public.cleanup_notifications_on_announcement_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where type = 'announcement'
    and metadata->>'announcement_id' = old.id::text;
  return old;
end;
$$;

create trigger trg_announcements_cleanup_notifications
  before delete on public.announcements
  for each row execute function public.cleanup_notifications_on_announcement_delete();
