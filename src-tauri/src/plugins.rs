// Claude Code 플러그인 레지스트리 — `~/.claude/plugins/cache/<marketplace>/<plugin-id>/`
// 폴더 구조에서 설치된 플러그인 ID 집합을 추출. 이 set 을 보고 tool_call 을 plugin/MCP
// 둘 중 어느 쪽에 카운트할지 정확하게 분류한다 (이름 패턴 휴리스틱 보다 신뢰도 ↑).

use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::OnceLock;

static KNOWN: OnceLock<HashSet<String>> = OnceLock::new();

/// 설치된 모든 Claude Code 플러그인 ID. Process lifetime 동안 한 번만 스캔.
pub fn known_plugin_ids() -> &'static HashSet<String> {
    KNOWN.get_or_init(scan_plugins)
}

fn cache_root() -> Option<PathBuf> {
    let home = std::env::var("CLAUDE_CONFIG_DIR")
        .ok()
        .map(PathBuf::from)
        .or_else(|| dirs::home_dir().map(|h| h.join(".claude")))?;
    Some(home.join("plugins").join("cache"))
}

fn scan_plugins() -> HashSet<String> {
    let mut out = HashSet::new();
    let Some(root) = cache_root() else { return out };
    let Ok(marketplaces) = std::fs::read_dir(&root) else { return out };
    for marketplace in marketplaces.flatten() {
        let Ok(plugins) = std::fs::read_dir(marketplace.path()) else { continue };
        for plugin in plugins.flatten() {
            if let Some(id) = plugin.path().file_name().and_then(|n| n.to_str()) {
                out.insert(id.to_owned());
            }
        }
    }
    out
}
