# V1 운영 Supabase 권한 적용 기록

2026-10-23 운영 프로젝트 `cduroqwecrhfkhtgxwru`에 `v1_admin_rls` migration(원격 버전 `20261023083321`)을 적용했다. 기존 행은 삭제하거나 수정하지 않았다.

## 적용 결과

| 테이블 | RLS | 적용 후 브라우저 접근 |
|---|---|---|
| `players` | 켜짐 | 공개 조회, 관리자 쓰기 |
| `match_scores` | 켜짐 | 공개 조회, 관리자 쓰기 |
| `hall_of_fame` | 켜짐 | 공개 조회, 관리자 쓰기 |
| `inquiries` | 켜짐 | 접근 차단, 기존 행 보존 |
| `scores` | 켜짐 | 접근 차단, 기존 행 보존 |

현재 Auth 사용자는 1명이다. 운영자는 2026-10-23 이 유일한 계정이 관리자 계정임을 확인했고, 같은 날 읽기 전용 조회로 `app_metadata.role = admin` 반영 및 기존 `provider`/`providers` 유지 상태를 확인했다. 로그인 여부만으로 관리자 권한을 주면 다른 계정이 생성되었을 때 쓰기 권한을 얻을 수 있으므로 정책은 이 역할을 확인한다. `user_metadata`는 사용자 스스로 바꿀 수 있어 권한 판정에 쓰지 않는다.

## 적용 순서와 검증

1. 관리자 계정과 `app_metadata.role = admin` 저장 상태는 확인했다. 서비스 역할 키를 브라우저나 저장소에 넣지 않는다.
2. 운영자가 로그아웃·재로그인을 완료했다고 확인했다. 기존 JWT는 역할 변경 직후 갱신되지 않을 수 있다.
3. GitHub Pages에서 문의 페이지 제거가 배포된 뒤 아래 정책을 [`supabase/migrations/20261023083321_v1_admin_rls.sql`](./supabase/migrations/20261023083321_v1_admin_rls.sql)로 적용했다. 파일명 버전은 Supabase 원격 migration 기록과 일치한다.
4. 운영 DB에서 5개 테이블의 RLS와 12개 정책을 확인했다. 공개 대시보드와 스트리머 화면에서 데이터가 표시됐다. 데이터 변경 없이 실행 계획을 확인한 결과 관리자 JWT의 `players` UPDATE 정책은 적용되고 익명 UPDATE는 차단됐다.
5. 관리자 화면의 실제 티어·출석·드래프트·점수·경기 종료 저장은 아직 확인하지 않았다. 운영 DB 백업·복구 수단도 이 작업에서 확인하지 못했다.

배포 전에는 `inquiry.html`과 `inquiries` 조회·저장 코드가 남아 있었으므로, 문의 페이지 제거를 먼저 배포했다. 새 요청의 `inquiry.html`은 404를 반환했다. 일부 브라우저 캐시에는 옛 페이지가 잠시 남을 수 있으나 DB 접근은 차단된다.

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

이 정책은 위 원격 migration으로 운영 DB에 적용했다. Supabase 보안 검사에서 `inquiries`와 `scores`의 정책 없음은 의도한 접근 차단으로 정보 수준으로 표시된다.
