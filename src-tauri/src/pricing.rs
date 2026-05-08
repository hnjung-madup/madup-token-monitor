use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Deserialize)]
pub struct ModelPrice {
    pub input_usd_per_mtok: f64,
    pub output_usd_per_mtok: f64,
}

type PriceTable = HashMap<String, ModelPrice>;

static PRICE_TABLE: OnceLock<PriceTable> = OnceLock::new();

fn load_price_table() -> PriceTable {
    // pricing.json is bundled next to the binary in src-tauri/
    let candidates = vec![
        PathBuf::from("pricing.json"),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join("pricing.json")))
            .unwrap_or_default(),
    ];
    for path in candidates {
        if path.exists() {
            if let Ok(text) = fs::read_to_string(&path) {
                if let Ok(table) = serde_json::from_str::<PriceTable>(&text) {
                    return table;
                }
            }
        }
    }
    PriceTable::new()
}

pub fn price_table() -> &'static PriceTable {
    PRICE_TABLE.get_or_init(load_price_table)
}

pub fn calc_cost_usd(
    model: &str,
    input_tokens: i64,
    output_tokens: i64,
    cache_read: i64,
    cache_write: i64,
) -> f64 {
    let table = price_table();
    // Try exact match first, then prefix match (e.g. "claude-sonnet-4" matches "claude-sonnet-4-5")
    let price = table.get(model).or_else(|| {
        table
            .iter()
            .find(|(k, _)| model.starts_with(k.as_str()) || k.starts_with(model))
            .map(|(_, v)| v)
    });

    if let Some(p) = price {
        let input_cost = (input_tokens as f64 / 1_000_000.0) * p.input_usd_per_mtok;
        let output_cost = (output_tokens as f64 / 1_000_000.0) * p.output_usd_per_mtok;
        // cache_read billed at 10% of input price, cache_write at 125% (Anthropic pricing)
        let cache_read_cost = (cache_read as f64 / 1_000_000.0) * p.input_usd_per_mtok * 0.1;
        let cache_write_cost = (cache_write as f64 / 1_000_000.0) * p.input_usd_per_mtok * 1.25;
        input_cost + output_cost + cache_read_cost + cache_write_cost
    } else {
        0.0
    }
}

// ── FX cache ────────────────────────────────────────────────────────────────

fn fx_cache_path() -> PathBuf {
    let base = dirs::cache_dir().unwrap_or_else(|| PathBuf::from("."));
    base.join("madup-token-monitor").join("fx.json")
}

#[derive(Debug, Deserialize, serde::Serialize)]
struct FxCache {
    rate: f64,
    fetched_at: u64, // unix seconds
}

pub fn usd_to_krw_rate() -> f64 {
    let path = fx_cache_path();

    // Try reading cached value (valid for 24 h)
    if path.exists() {
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(cache) = serde_json::from_str::<FxCache>(&text) {
                let age = SystemTime::now()
                    .duration_since(SystemTime::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
                    .saturating_sub(cache.fetched_at);
                if age < 86_400 {
                    return cache.rate;
                }
            }
        }
    }

    // Fetch fresh rate (blocking — called rarely)
    let rate = fetch_krw_rate().unwrap_or(1_350.0); // fallback
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs();
    let cache = FxCache { rate, fetched_at: now };
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    if let Ok(text) = serde_json::to_string(&cache) {
        fs::write(&path, text).ok();
    }
    rate
}

fn fetch_krw_rate() -> Option<f64> {
    #[derive(Deserialize)]
    struct FxResp {
        rates: HashMap<String, f64>,
    }
    let resp = ureq::get("https://api.frankfurter.app/latest?from=USD&to=KRW")
        .timeout(Duration::from_secs(5))
        .call()
        .ok()?;
    let body: FxResp = resp.into_json().ok()?;
    body.rates.get("KRW").copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calc_cost_known_model() {
        // claude-3-5-sonnet: $3/Mtok input, $15/Mtok output
        let cost = calc_cost_usd("claude-3-5-sonnet-20241022", 1_000_000, 100_000, 0, 0);
        assert!((cost - 4.5).abs() < 0.001, "cost={cost}");
    }

    #[test]
    fn test_calc_cost_unknown_model() {
        let cost = calc_cost_usd("unknown-model-xyz", 1_000_000, 1_000_000, 0, 0);
        assert_eq!(cost, 0.0);
    }

    #[test]
    fn test_calc_cost_cache() {
        // cache_read at 10% of input, cache_write at 125%
        // input $3/Mtok → read $0.3/Mtok, write $3.75/Mtok
        let cost = calc_cost_usd("claude-3-5-sonnet-20241022", 0, 0, 1_000_000, 1_000_000);
        let expected = 0.3 + 3.75;
        assert!((cost - expected).abs() < 0.001, "cost={cost}");
    }
}
