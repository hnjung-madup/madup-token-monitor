-- 0009_drop_optin_anon.sql: 사내 집계 opt-in / 익명 표시 제거
--
-- 모니터링 목적이므로 사내 집계는 항상 공유, 실명/아바타로 표시.
--   1) profiles.share_consent default true + 기존 row 일괄 true
--   2) RPC 4개 재정의: `where p.share_consent = true` 제거,
--      `case when p.anonymized then '익명'` 분기 제거 → 항상 실명/아바타
-- share_consent / anonymized 컬럼 자체는 호환 위해 유지 (참조만 제거).

alter table profiles alter column share_consent set default true;
update profiles set share_consent = true where share_consent is distinct from true;

-- 주간 비용 TOP10
create or replace function get_weekly_top10()
returns table (
  display_name text,
  avatar_url   text,
  total_cost   numeric
)
language sql security definer stable as $$
  select
    coalesce(p.slack_handle, p.name, '알 수 없음') as display_name,
    p.avatar_url,
    sum(ua.total_cost_usd) as total_cost
  from usage_aggregates ua
  join profiles p on p.id = ua.user_id
  where ua.date >= current_date - interval '7 days'
  group by p.id, p.slack_handle, p.name, p.avatar_url
  order by total_cost desc
  limit 10;
$$;

-- 기간별 사내 비용 TOP-N
create or replace function get_top_users(range_days int default 30, max_rows int default 50)
returns table (
  display_name text,
  avatar_url   text,
  total_cost   numeric,
  total_tokens bigint
)
language sql security definer stable as $$
  select
    coalesce(p.slack_handle, p.name, '알 수 없음') as display_name,
    p.avatar_url,
    sum(ua.total_cost_usd) as total_cost,
    sum(ua.total_tokens) as total_tokens
  from usage_aggregates ua
  join profiles p on p.id = ua.user_id
  where ua.date >= current_date - (range_days || ' days')::interval
  group by p.id, p.slack_handle, p.name, p.avatar_url
  order by total_cost desc
  limit max_rows;
$$;

-- MCP 서버 TOP10
create or replace function get_top_mcp_servers(range_days int default 30)
returns table (
  mcp_server  text,
  total_count bigint
)
language sql security definer stable as $$
  select
    mu.mcp_server,
    sum(mu.count) as total_count
  from mcp_usage mu
  join profiles p on p.id = mu.user_id
  where mu.date >= current_date - (range_days || ' days')::interval
  group by mu.mcp_server
  order by total_count desc
  limit 10;
$$;

-- 플러그인 TOP10
create or replace function get_top_plugins(range_days int default 30)
returns table (
  plugin_id   text,
  total_count bigint
)
language sql security definer stable as $$
  select
    pu.plugin_id,
    sum(pu.count) as total_count
  from plugin_usage pu
  join profiles p on p.id = pu.user_id
  where pu.date >= current_date - (range_days || ' days')::interval
  group by pu.plugin_id
  order by total_count desc
  limit 10;
$$;
