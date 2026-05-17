-- 0010_user_detail.sql: 리더보드 USER 행 클릭 상세용
--
--   1) get_top_users 가 user_id 도 반환 (상세 조회 식별자)
--   2) get_user_mcp / get_user_plugins — 특정 user 의 MCP/플러그인 TOP
--      (security definer — 다른 사람 mcp_usage/plugin_usage 는 RLS 로 막혀 있으므로
--       RPC 우회). 모니터링 사내 도구라 익명/옵트인 없음.
-- 모델별 토큰은 usage_aggregates 에 model 차원이 없어 제외.

-- get_top_users 는 반환 컬럼이 바뀌므로 (user_id 추가) create or replace 불가 → 먼저 drop.
drop function if exists get_top_users(int, int);

create or replace function get_top_users(range_days int default 30, max_rows int default 50)
returns table (
  user_id      uuid,
  display_name text,
  avatar_url   text,
  total_cost   numeric,
  total_tokens bigint
)
language sql security definer stable as $$
  select
    p.id as user_id,
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

create or replace function get_user_mcp(p_user uuid, range_days int default 30)
returns table (
  mcp_server  text,
  total_count bigint
)
language sql security definer stable as $$
  select
    mu.mcp_server,
    sum(mu.count) as total_count
  from mcp_usage mu
  where mu.user_id = p_user
    and mu.date >= current_date - (range_days || ' days')::interval
  group by mu.mcp_server
  order by total_count desc
  limit 10;
$$;

create or replace function get_user_plugins(p_user uuid, range_days int default 30)
returns table (
  plugin_id   text,
  total_count bigint
)
language sql security definer stable as $$
  select
    pu.plugin_id,
    sum(pu.count) as total_count
  from plugin_usage pu
  where pu.user_id = p_user
    and pu.date >= current_date - (range_days || ' days')::interval
  group by pu.plugin_id
  order by total_count desc
  limit 10;
$$;
