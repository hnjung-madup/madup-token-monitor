-- 0007_cleanup_plugin_usage.sql
-- 옛 클라이언트 파서가 plugin_usage에 잘못 업로드한 row 정리.
--
-- 잘못된 케이스:
--   - plugin_id 가 일반 MCP 서버 이름인 경우 (mcp-atlassian, slack-bot, slack 등)
--   - plugin_id 가 raw 형식인 경우 (plugin_oh-my-claudecode_t — _t 접미사가 붙은 채)
--
-- 새 파서는 plugin_<name>_t 에서 <name> 만 추출하고, 일반 MCP 서버는 plugin로 카운트하지 않음.
-- 이 마이그레이션 적용 후, 클라이언트가 다음 sync에서 정확한 row(oh-my-claudecode 등)로 채움.

delete from plugin_usage
where plugin_id like 'mcp-%'
   or plugin_id like 'mcp\_%' escape '\'
   or plugin_id like 'plugin\_%\_t' escape '\'
   or plugin_id in ('slack', 'slack-bot', 'context7', 'puppeteer', 'playwright',
                    'atlassian', 'claude_ai_Google_Drive');
