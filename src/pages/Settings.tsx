import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuthUser } from "../hooks/useAuthUser";
import { Avatar } from "../components/Avatar";

export default function Settings() {
  const { user } = useAuthUser();
  const [optIn, setOptIn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("opt_in_aggregate");
    setOptIn(stored === "true");
  }, []);

  function handleOptInChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    setOptIn(val);
    localStorage.setItem("opt_in_aggregate", String(val));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

        <label className="flex items-start gap-3 cursor-pointer p-4 border border-hairline rounded-lg hover:border-ink transition-colors">
          <input
            type="checkbox"
            checked={optIn}
            onChange={handleOptInChange}
            className="mt-0.5 w-4 h-4 accent-[#024ad8]"
          />
          <div>
            <p className="hp-body-emphasis text-ink">
              익명화된 토큰 사용량을 팀 집계에 포함하는 것에 동의합니다
            </p>
            <p className="hp-caption text-graphite mt-1">
              언제든 이 토글을 해제해 즉시 철회할 수 있습니다.
            </p>
          </div>
        </label>
        {saved && (
          <p className="hp-caption text-primary mt-3 font-semibold">
            ✓ 저장되었습니다.
          </p>
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
