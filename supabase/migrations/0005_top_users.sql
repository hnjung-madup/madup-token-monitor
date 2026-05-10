-- 0005_top_users.sql: 기간별 사내 비용 TOP-N RPC
-- get_weekly_top10()을 일반화: 임의 range_days + 최대 row 수 + 토큰 합계.

create or replace function get_top_users(range_days int default 30, max_rows int default 50)
returns table (
  display_name text,
  avatar_url   text,
  total_cost   numeric,
  total_tokens bigint
)
language sql security definer stable as $$
  select
    case when p.anonymized then '익명'
         else coalesce(p.slack_handle, p.name, '알 수 없음')
    end as display_name,
    case when p.anonymized then null
         else p.avatar_url
    end as avatar_url,
    sum(ua.total_cost_usd) as total_cost,
    sum(ua.total_input + ua.total_output) as total_tokens
  from usage_aggregates ua
  join profiles p on p.id = ua.user_id
  where p.share_consent = true
    and ua.date >= current_date - (range_days || ' days')::interval
  group by p.id, p.anonymized, p.slack_handle, p.name, p.avatar_url
  order by total_cost desc
  limit max_rows;
$$;
