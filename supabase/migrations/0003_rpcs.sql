-- 0003_rpcs.sql: 사내 집계 RPC 함수 (security definer — RLS 우회 가능)

-- 주간 비용 TOP10 (share_consent=true 유저만, anonymized=true면 slack_handle 마스킹)
create or replace function get_weekly_top10()
returns table (
  display_name text,
  avatar_url   text,
  total_cost   numeric
)
language sql security definer stable as $$
  select
    case when p.anonymized then '익명'
         else coalesce(p.slack_handle, p.name, '알 수 없음')
    end as display_name,
    case when p.anonymized then null
         else p.avatar_url
    end as avatar_url,
    sum(ua.total_cost_usd) as total_cost
  from usage_aggregates ua
  join profiles p on p.id = ua.user_id
  where p.share_consent = true
    and ua.date >= current_date - interval '7 days'
  group by p.id, p.anonymized, p.slack_handle, p.name, p.avatar_url
  order by total_cost desc
  limit 10;
$$;

-- MCP 서버 TOP10 (기간 지정, share_consent=true 유저 합산)
create or replace function get_top_mcp_servers(range_days int default 30)
returns table (
  mcp_server text,
  total_count bigint
)
language sql security definer stable as $$
  select
    mu.mcp_server,
    sum(mu.count) as total_count
  from mcp_usage mu
  join profiles p on p.id = mu.user_id
  where p.share_consent = true
    and mu.date >= current_date - (range_days || ' days')::interval
  group by mu.mcp_server
  order by total_count desc
  limit 10;
$$;

-- 플러그인 TOP10 (기간 지정, share_consent=true 유저 합산)
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
  where p.share_consent = true
    and pu.date >= current_date - (range_days || ' days')::interval
  group by pu.plugin_id
  order by total_count desc
  limit 10;
$$;
