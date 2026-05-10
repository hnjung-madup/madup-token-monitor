import { useEffect, useState } from "react";
import { supabase, getProfile, updateProfile } from "../lib/supabase";
import { syncAggregatesNow, type SyncResult } from "../lib/auth";
import { useAuthUser } from "../hooks/useAuthUser";
import { Avatar } from "../components/Avatar";

export default function Settings() {
  const { user } = useAuthUser();
  const [shareConsent, setShareConsent] = useState(false);
  const [anonymized, setAnonymized] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Supabase profiles 테이블에서 현재 토글 상태 읽기
  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const profile = await getProfile(user.id);
      if (cancelled) return;
      if (profile) {
        setShareConsent(profile.share_consent);
        setAnonymized(profile.anonymized);
      }
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function persistToggle(updates: { share_consent?: boolean; anonymized?: boolean }) {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(user.id, updates);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleShareConsentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setShareConsent(val);
    persistToggle({ share_consent: val });
  }

  function handleAnonymizedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setAnonymized(val);
    persistToggle({ anonymized: val });
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const result = await syncAggregatesNow();
      if (result) setSyncResult(result);
      else setSyncError("로그인되어 있지 않거나 환경설정 누락");
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: { redirectTo: window.location.href },
    });
  }

  return (
    <div className="px-10 py-10 max-w-[920px] mx-auto space-y-10">
      <header>
        <p className="hp-eyebrow mb-3">Account & Privacy</p>
        <h1 className="hp-display-lg text-ink">설정</h1>
      </header>

      {/* Account */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-8">
        <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-4">
          01 · 계정
        </p>
        {user ? (
          <div className="flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <Avatar
                src={user.avatarUrl}
                name={user.name}
                size={64}
                rounded="md"
              />
              <div>
                <p className="hp-display-xs text-ink">
                  {user.name || "(이름 없음)"}
                </p>
                <p className="hp-caption text-graphite mt-1">{user.email}</p>
                {user.slackHandle && (
                  <p className="hp-caption-sm text-graphite mt-0.5">
                    @{user.slackHandle}
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleSignOut} className="hp-btn-outline-ink">
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="hp-body text-charcoal max-w-md">
              로그인하면 팀 채팅과 사내 집계 기능을 사용할 수 있습니다.
            </p>
            <button onClick={handleSignIn} className="hp-btn-primary">
              Slack으로 로그인
            </button>
          </div>
        )}
      </section>

      {/* Data policy */}
      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-8">
        <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-4">
          02 · 데이터 정책
        </p>
        <h2 className="hp-display-xs text-ink mb-3">사내 집계 옵트인</h2>
        <p className="hp-body text-charcoal mb-6">
          사내 집계 기능은 <span className="font-semibold text-ink">옵트인</span>{" "}
          방식입니다. 동의하는 경우에만 익명화된 토큰 사용량이 팀 대시보드에
          집계됩니다. 원시 로그나 대화 내용은 전송되지 않습니다.
        </p>

        {!user ? (
          <p className="hp-caption text-graphite italic">
            로그인 후 옵트인 설정이 가능합니다.
          </p>
        ) : (
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-4 border border-hairline rounded-lg transition-colors ${
                loadingProfile ? "opacity-50 cursor-wait" : "cursor-pointer hover:border-ink"
              }`}
            >
              <input
                type="checkbox"
                checked={shareConsent}
                onChange={handleShareConsentChange}
                disabled={loadingProfile || saving}
                className="mt-0.5 w-4 h-4 accent-[#024ad8]"
              />
              <div>
                <p className="hp-body-emphasis text-ink">
                  익명화된 토큰 사용량을 팀 집계에 포함하는 것에 동의합니다
                </p>
                <p className="hp-caption text-graphite mt-1">
                  토큰 카운트와 비용 합계만 업로드됩니다. 원본 메시지/프롬프트는 전송 X.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 border border-hairline rounded-lg transition-colors ${
                !shareConsent || loadingProfile
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:border-ink"
              }`}
            >
              <input
                type="checkbox"
                checked={anonymized}
                onChange={handleAnonymizedChange}
                disabled={!shareConsent || loadingProfile || saving}
                className="mt-0.5 w-4 h-4 accent-[#024ad8]"
              />
              <div>
                <p className="hp-body-emphasis text-ink">사내 리더보드에서 익명으로 표시</p>
                <p className="hp-caption text-graphite mt-1">
                  Slack 핸들/아바타 대신 "익명"으로 표시됩니다. 본인 데이터는 본인만 볼 수 있습니다.
                </p>
              </div>
            </label>
          </div>
        )}

        {saved && (
          <p className="hp-caption text-primary mt-3 font-semibold">✓ 저장되었습니다.</p>
        )}
        {error && (
          <p className="hp-caption text-[#dc2626] mt-3">저장 실패: {error}</p>
        )}

        {user && shareConsent && (
          <div className="mt-6 pt-6 border-t border-hairline">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="hp-body-emphasis text-ink">사내 집계 즉시 동기화</p>
                <p className="hp-caption text-graphite mt-1">
                  앱 시작 후 5초, 그 다음 1시간마다 자동 동기화됩니다. 즉시 반영하려면 버튼을 누르세요.
                </p>
              </div>
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className="px-3 py-1.5 text-[12px] font-semibold rounded-md border border-hairline bg-canvas text-charcoal hover:bg-cloud transition-colors disabled:opacity-60"
              >
                {syncing ? "동기화 중…" : "지금 동기화"}
              </button>
            </div>
            {syncResult && (
              <p className="hp-caption text-primary mt-3 font-semibold">
                ✓ 동기화 완료 — 사용량 {syncResult.usage_rows}건 / MCP {syncResult.mcp_rows}건 / 플러그인 {syncResult.plugin_rows}건
              </p>
            )}
            {syncError && (
              <p className="hp-caption text-[#dc2626] mt-3 break-all">동기화 실패: {syncError}</p>
            )}
          </div>
        )}
      </section>

      {/* App info */}
      <section className="hp-card-cloud p-8">
        <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-4">
          03 · 앱 정보
        </p>
        <dl className="grid grid-cols-[120px_1fr] gap-y-3">
          <dt className="hp-caption text-graphite">버전</dt>
          <dd className="hp-body-emphasis text-ink">0.1.0</dd>
          <dt className="hp-caption text-graphite">업데이트</dt>
          <dd className="hp-body text-charcoal">자동 업데이트가 활성화되어 있습니다.</dd>
          <dt className="hp-caption text-graphite">데이터 위치</dt>
          <dd className="hp-caption text-charcoal font-mono">
            ~/Library/Application Support/madup-token-monitor/
          </dd>
        </dl>
      </section>
    </div>
  );
}
