-- 0008_cleanup_mcp_usage.sql
-- Claude Code 플러그인(plugin_<name>_t)이 mcp_usage 테이블에 외부 MCP 서버처럼 잘못 들어가 있던
-- row 제거. 새 클라이언트 파서는 plugin_*_t를 mcp_server에 카운트하지 않고 plugin_usage에만 넣음.
-- 적용 후 다음 sync에서 깨끗한 상태로 재구성됨.

delete from mcp_usage
where mcp_server like 'plugin\_%\_t' escape '\';

-- 그 외 옛 휴리스틱 흔적도 함께 청소 (raw mcp__ prefix 등 비정상 케이스).
delete from mcp_usage
where mcp_server like 'mcp\_\_%' escape '\';
