-- 0001_init.sql: 초기 스키마 생성

-- 매드업 도메인 이메일 검증 함수
-- search_path 명시: security definer 함수는 정의자의 default를 쓰므로 public을 못 찾을 수 있음
create or replace function validate_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email not like '%@madup.com' then
    raise exception 'Only @madup.com email addresses are allowed';
  end if;
  return new;
end;
$$;

-- auth.users 삽입 시 도메인 검증 트리거
create or replace trigger check_email_domain
  before insert on auth.users
  for each row execute function validate_email_domain();

-- 프로필 테이블
create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  slack_user_id text,
  slack_handle  text,
  name          text,
  email         text,
  avatar_url    text,
  share_consent boolean default false,
  anonymized    boolean default false,
  created_at    timestamptz default now()
);

-- 일별 사용량 집계 (source: 'claude_code', 'claude_api' 등)
create table usage_aggregates (
  user_id        uuid references profiles on delete cascade,
  date           date not null,
  source         text not null,
  total_input    bigint not null default 0,
  total_output   bigint not null default 0,
  total_cost_usd numeric(12, 6) not null default 0,
  primary key (user_id, date, source)
);

-- MCP 서버별 일별 사용 횟수
create table mcp_usage (
  user_id    uuid references profiles on delete cascade,
  date       date not null,
  mcp_server text not null,
  count      bigint not null default 0,
  primary key (user_id, date, mcp_server)
);

-- 플러그인별 일별 사용 횟수
create table plugin_usage (
  user_id   uuid references profiles on delete cascade,
  date      date not null,
  plugin_id text not null,
  count     bigint not null default 0,
  primary key (user_id, date, plugin_id)
);

-- 신규 유저 가입 시 profiles 자동 생성
-- public.profiles 명시 + search_path 고정 (SQLSTATE 42P01 "relation profiles does not exist" 방지)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
