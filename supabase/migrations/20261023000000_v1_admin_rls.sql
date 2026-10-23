-- V1 production RLS policy. Apply only after the inquiry page removal is deployed
-- and the admin has signed in again to obtain an updated JWT.
-- Existing rows are preserved. This migration does not modify V2 tables.

begin;

alter table public.players enable row level security;
alter table public.match_scores enable row level security;
alter table public.hall_of_fame enable row level security;
alter table public.inquiries enable row level security;
alter table public.scores enable row level security;

revoke all on public.inquiries from anon, authenticated;
revoke all on public.scores from anon, authenticated;

create policy "v1 players public read" on public.players
  for select to anon, authenticated using (true);
create policy "v1 players admin insert" on public.players
  for insert to authenticated
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 players admin update" on public.players
  for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 players admin delete" on public.players
  for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "v1 scores public read" on public.match_scores
  for select to anon, authenticated using (true);
create policy "v1 scores admin insert" on public.match_scores
  for insert to authenticated
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 scores admin update" on public.match_scores
  for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 scores admin delete" on public.match_scores
  for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

create policy "v1 history public read" on public.hall_of_fame
  for select to anon, authenticated using (true);
create policy "v1 history admin insert" on public.hall_of_fame
  for insert to authenticated
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 history admin update" on public.hall_of_fame
  for update to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin')
  with check ((select auth.jwt()->'app_metadata'->>'role') = 'admin');
create policy "v1 history admin delete" on public.hall_of_fame
  for delete to authenticated
  using ((select auth.jwt()->'app_metadata'->>'role') = 'admin');

commit;
