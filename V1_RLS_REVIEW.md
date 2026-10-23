# V1 운영 Supabase 권한 검토안

2026-10-23 읽기 전용으로 운영 프로젝트 `cduroqwecrhfkhtgxwru`를 확인했다. 아래 SQL은 **검토용이며 실행하지 않았다**.

## 확인된 상태

| 테이블 | RLS | `anon` 권한 | V1에서 필요한 접근 |
|---|---|---|---|
| `players` | 꺼짐 | 조회·추가·수정·삭제 | 공개 조회, 관리자 쓰기 |
| `match_scores` | 꺼짐 | 조회·추가·수정·삭제 | 공개 조회, 관리자 쓰기 |
| `hall_of_fame` | 꺼짐 | 조회·추가·수정·삭제 | 공개 조회, 관리자 쓰기 |
| `inquiries` | 꺼짐 | 조회·추가·수정·삭제 | 문의 페이지 제거 후 브라우저 접근 불필요 |
| `scores` | 꺼짐 | 조회·추가·수정·삭제 | 현재 `index.html`은 `home.js`를 사용하므로 접근 불필요 |

현재 Auth 사용자는 1명이다. 운영자는 2026-10-23 이 유일한 계정이 관리자 계정임을 확인했고, 같은 날 읽기 전용 조회로 `app_metadata.role = admin` 반영 및 기존 `provider`/`providers` 유지 상태를 확인했다. 로그인 여부만으로 관리자 권한을 주면 다른 계정이 생성되었을 때 쓰기 권한을 얻을 수 있으므로 정책은 이 역할을 확인한다. `user_metadata`는 사용자 스스로 바꿀 수 있어 권한 판정에 쓰지 않는다.

## 적용 전 결정과 검증

1. 관리자 계정과 `app_metadata.role = admin` 저장 상태는 확인했다. 서비스 역할 키를 브라우저나 저장소에 넣지 않는다.
2. 해당 계정의 새 세션에서 JWT `app_metadata.role`이 `admin`인지 확인한다. 기존 JWT는 역할 변경 직후 갱신되지 않을 수 있다.
3. 운영 DB 백업과 복구 방법을 확인한다.
4. 아래 정책은 [`supabase/migrations/20261023000000_v1_admin_rls.sql`](./supabase/migrations/20261023000000_v1_admin_rls.sql)에 기록했다. 테스트 프로젝트에서 익명·관리자 두 역할의 조회/쓰기 동작을 검증한다.
5. 운영에 적용한 뒤 공개 대시보드와 관리자 티어·출석·드래프트·점수·경기 종료 흐름을 확인한다.

현재 배포본에는 `inquiry.html`과 `inquiries` 조회·저장 코드가 남아 있다. 준비한 정책은 이 테이블의 브라우저 접근을 막으므로 **문의 페이지 제거 코드가 실제 배포된 뒤에만** 이 migration을 적용한다. 배포 전 적용하면 운영 문의 페이지가 실패한다. 관리자도 역할 변경 뒤 새 JWT를 받도록 로그아웃·재로그인해야 한다.

## 정책 초안

아래 SQL은 기존 브라우저 동작을 기준으로 작성했다. 관리자 역할이 준비되지 않은 상태에서 실행하면 관리자 쓰기가 막힌다. `inquiries`와 `scores`는 기존 데이터는 보존하면서 API 접근만 막는다.

```sql
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
```

이 정책은 저장소의 migration 파일에 기록했으나 운영 DB에는 적용하지 않았다.
