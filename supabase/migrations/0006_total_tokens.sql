-- 0006_total_tokens.sql: usage_aggregates에 total_tokens 컬럼 추가
-- 대시보드의 sumIO(input + output + cache_read + cache_write)와 RPC가 같은 값을 보도록 통일.

alter table usage_aggregates
  add column if not exists total_tokens bigint not null default 0;

-- 기존 row 백필 — input + output만 알고 있으므로 그것만이라도 채워둔다.
-- 다음 동기화 후 cache 포함값으로 덮어씌워짐.
update usage_aggregates
   set total_tokens = total_input + total_output
 where total_tokens = 0
   and total_input + total_output > 0;

-- get_top_users RPC 재정의: total_tokens 컬럼 사용.
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
    sum(ua.total_tokens) as total_tokens
  from usage_aggregates ua
  join profiles p on p.id = ua.user_id
  where p.share_consent = true
    and ua.date >= current_date - (range_days || ' days')::interval
  group by p.id, p.anonymized, p.slack_handle, p.name, p.avatar_url
  order by total_cost desc
  limit max_rows;
$$;
