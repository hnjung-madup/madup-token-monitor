import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface UserInfo {
  email: string;
  name: string;
}

export default function Settings() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [optIn, setOptIn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email ?? "",
          name:
            data.user.user_metadata?.full_name ??
            data.user.user_metadata?.name ??
            "",
        });
      }
    });
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
    setUser(null);
  }

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: { redirectTo: window.location.href },
    });
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold mb-6 text-gray-900">설정</h1>

      {/* Account section */}
      <section className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <h2 className="font-semibold text-gray-700 mb-3">계정</h2>
        {user ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{user.name || "(이름 없음)"}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">로그인하면 팀 채팅과 집계 기능을 사용할 수 있습니다.</p>
            <button
              onClick={handleSignIn}
              className="px-3 py-1.5 text-sm bg-[#4A154B] text-white rounded-lg hover:bg-[#3d1140] transition-colors"
            >
              Slack 로그인
            </button>
          </div>
        )}
      </section>

      {/* Data policy section */}
      <section className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <h2 className="font-semibold text-gray-700 mb-1">데이터 정책</h2>
        <p className="text-xs text-gray-500 mb-3">
          사내 집계 기능은 <strong>옵트인</strong> 방식입니다. 동의하는 경우에만 익명화된 토큰 사용량이 팀 대시보드에 집계됩니다.
          원시 로그나 대화 내용은 전송되지 않습니다.
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={optIn}
            onChange={handleOptInChange}
            className="w-4 h-4 accent-blue-500"
          />
          <span className="text-sm text-gray-700">
            익명화된 토큰 사용량을 팀 집계에 포함하는 것에 동의합니다
          </span>
        </label>
        {saved && (
          <p className="text-xs text-green-600 mt-2">저장되었습니다.</p>
        )}
      </section>

      {/* App info section */}
      <section className="p-4 bg-white rounded-xl border border-gray-200">
        <h2 className="font-semibold text-gray-700 mb-2">앱 정보</h2>
        <dl className="text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24">버전</dt>
            <dd className="text-gray-900">0.1.0</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-24">업데이트</dt>
            <dd className="text-gray-900 text-xs">자동 업데이트가 활성화되어 있습니다.</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
