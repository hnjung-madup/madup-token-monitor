// Anthropic의 비공개 OAuth Usage API로 5h/7d 사용량 조회.
// Claude Code가 macOS Keychain (또는 ~/.claude/.credentials.json)에 저장한 OAuth 토큰을
// 그대로 사용해서 Bearer 인증한다. 토큰은 외부로 전송하지 않으며, 응답값은 메모리 캐시에만 보관.
//
// soulduse/ai-token-monitor 의 oauth_usage.rs 를 단순화한 포팅.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageWindow {
    pub utilization: f64,
    pub resets_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuthUsage {
    pub five_hour: Option<UsageWindow>,
    pub seven_day: Option<UsageWindow>,
    pub seven_day_sonnet: Option<UsageWindow>,
    pub seven_day_opus: Option<UsageWindow>,
    pub fetched_at: String,
    pub is_stale: bool,
}

struct CacheEntry {
    usage: OAuthUsage,
    fetched_at: Instant,
}

static OAUTH_CACHE: Mutex<Option<CacheEntry>> = Mutex::new(None);
static RATE_LIMIT_UNTIL: Mutex<Option<Instant>> = Mutex::new(None);

#[derive(Debug, Deserialize)]
struct ApiResponse {
    five_hour: Option<ApiUsageWindow>,
    seven_day: Option<ApiUsageWindow>,
    seven_day_sonnet: Option<ApiUsageWindow>,
    seven_day_opus: Option<ApiUsageWindow>,
}

#[derive(Debug, Deserialize)]
struct ApiUsageWindow {
    utilization: f64,
    resets_at: String,
}

fn read_oauth_token() -> Option<String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(t) = read_oauth_token_keychain() {
            return Some(t);
        }
    }
    read_oauth_token_file()
}

#[cfg(target_os = "macos")]
fn read_oauth_token_keychain() -> Option<String> {
    use std::process::Command;

    let account = std::env::var("USER").ok()?;
    // Claude Code v1: legacy service name. v2.1.52+ uses suffix hashes.
    let candidates = [
        "Claude Code-credentials".to_string(),
    ];

    for service in &candidates {
        let output = Command::new("/usr/bin/security")
            .args(["find-generic-password", "-s", service, "-a", &account, "-w"])
            .output()
            .ok()?;
        if !output.status.success() {
            continue;
        }
        if let Some(token) = extract_token_from_keychain_data(&output.stdout) {
            return Some(token);
        }
    }
    None
}

fn extract_token_from_keychain_data(data: &[u8]) -> Option<String> {
    let json_str = String::from_utf8_lossy(data);
    let json_str = json_str.trim_start_matches(|c: char| !c.is_ascii() || c == '\x07');
    let value: serde_json::Value = serde_json::from_str(json_str).ok()?;
    value
        .get("claudeAiOauth")?
        .get("accessToken")?
        .as_str()
        .map(|s| s.to_string())
}

fn read_oauth_token_file() -> Option<String> {
    let dir: PathBuf = std::env::var("CLAUDE_CONFIG_DIR")
        .ok()
        .map(PathBuf::from)
        .or_else(|| dirs::home_dir().map(|h| h.join(".claude")))?;
    let path = dir.join(".credentials.json");
    let content = std::fs::read_to_string(&path).ok()?;
    let value: serde_json::Value = serde_json::from_str(&content).ok()?;
    value
        .get("claudeAiOauth")?
        .get("accessToken")?
        .as_str()
        .map(|s| s.to_string())
}

fn fetch_usage_from_api(token: &str) -> Result<OAuthUsage, String> {
    let resp = ureq::get("https://api.anthropic.com/api/oauth/usage")
        .set("Authorization", &format!("Bearer {}", token))
        .set("anthropic-beta", "oauth-2025-04-20")
        .set("Content-Type", "application/json")
        .set("User-Agent", "claude-code/1.0.0")
        .call();

    match resp {
        Ok(r) => {
            let api: ApiResponse = r.into_json().map_err(|e| format!("JSON parse: {e}"))?;
            Ok(OAuthUsage {
                five_hour: api.five_hour.map(|w| UsageWindow {
                    utilization: w.utilization,
                    resets_at: w.resets_at,
                }),
                seven_day: api.seven_day.map(|w| UsageWindow {
                    utilization: w.utilization,
                    resets_at: w.resets_at,
                }),
                seven_day_sonnet: api.seven_day_sonnet.map(|w| UsageWindow {
                    utilization: w.utilization,
                    resets_at: w.resets_at,
                }),
                seven_day_opus: api.seven_day_opus.map(|w| UsageWindow {
                    utilization: w.utilization,
                    resets_at: w.resets_at,
                }),
                fetched_at: chrono::Local::now().to_rfc3339(),
                is_stale: false,
            })
        }
        Err(ureq::Error::Status(429, response)) => {
            let retry_after = response
                .header("retry-after")
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(300);
            if let Ok(mut guard) = RATE_LIMIT_UNTIL.lock() {
                *guard = Some(Instant::now() + std::time::Duration::from_secs(retry_after));
            }
            Err(format!("Rate limited (429), retry after {retry_after}s"))
        }
        Err(ureq::Error::Status(code, _)) => Err(format!("HTTP {code}")),
        Err(ureq::Error::Transport(e)) => Err(format!("Transport: {e}")),
    }
}

fn get_oauth_usage_impl(force: bool) -> Result<OAuthUsage, String> {
    // 1) rate-limit window
    if let Ok(guard) = RATE_LIMIT_UNTIL.lock() {
        if let Some(until) = *guard {
            if Instant::now() < until {
                if let Ok(cache) = OAUTH_CACHE.lock() {
                    if let Some(ref e) = *cache {
                        let mut u = e.usage.clone();
                        u.is_stale = true;
                        return Ok(u);
                    }
                }
                return Err("rate-limited".into());
            }
        }
    }

    // 2) fresh cache (10분 미만, force일 땐 skip)
    if !force {
        if let Ok(cache) = OAUTH_CACHE.lock() {
            if let Some(ref e) = *cache {
                if e.fetched_at.elapsed().as_secs() < 600 {
                    return Ok(e.usage.clone());
                }
            }
        }
    }

    // 3) fetch
    let token = read_oauth_token().ok_or_else(|| {
        "Claude Code OAuth 토큰을 찾을 수 없습니다. Claude Code에 로그인되어 있는지 확인해주세요."
            .to_string()
    })?;
    let usage = fetch_usage_from_api(&token)?;

    if let Ok(mut cache) = OAUTH_CACHE.lock() {
        *cache = Some(CacheEntry {
            usage: usage.clone(),
            fetched_at: Instant::now(),
        });
    }
    Ok(usage)
}

#[tauri::command]
pub fn get_oauth_usage() -> Result<OAuthUsage, String> {
    get_oauth_usage_impl(false)
}

#[tauri::command]
pub fn refresh_oauth_usage() -> Result<OAuthUsage, String> {
    get_oauth_usage_impl(true)
}
