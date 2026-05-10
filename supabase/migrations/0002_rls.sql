-- 0002_rls.sql: Row Level Security 정책

-- profiles RLS
alter table profiles enable row level security;

create policy "profiles: 본인만 조회"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: 본인만 수정"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- usage_aggregates RLS
alter table usage_aggregates enable row level security;

-- 본인 row select 정책: PostgREST upsert(merge-duplicates)가 conflict resolve 시
-- 기존 row를 SELECT할 수 있어야 한다. 정책 부재 시 자기 row도 0건으로 보여 upsert 실패.
create policy "usage_aggregates: 본인 row select"
  on usage_aggregates for select
  using (auth.uid() = user_id);

create policy "usage_aggregates: 본인만 삽입"
  on usage_aggregates for insert
  with check (auth.uid() = user_id);

create policy "usage_aggregates: 본인만 수정"
  on usage_aggregates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 사내 집계는 RPC get_weekly_top10()/get_top_*() (security definer)로만 우회 조회.

-- mcp_usage RLS
alter table mcp_usage enable row level security;

create policy "mcp_usage: 본인 row select"
  on mcp_usage for select
  using (auth.uid() = user_id);

create policy "mcp_usage: 본인만 삽입"
  on mcp_usage for insert
  with check (auth.uid() = user_id);

create policy "mcp_usage: 본인만 수정"
  on mcp_usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- plugin_usage RLS
alter table plugin_usage enable row level security;

create policy "plugin_usage: 본인 row select"
  on plugin_usage for select
  using (auth.uid() = user_id);

create policy "plugin_usage: 본인만 삽입"
  on plugin_usage for insert
  with check (auth.uid() = user_id);

create policy "plugin_usage: 본인만 수정"
  on plugin_usage for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
