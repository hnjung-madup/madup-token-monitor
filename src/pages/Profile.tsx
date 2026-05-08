import { useEffect, useState } from "react";
import { supabase, getProfile, updateProfile, signOut, type Profile } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) getProfile(data.user.id).then(setProfile);
    });
  }, []);

  async function toggle(field: "share_consent" | "anonymized") {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = { ...profile, [field]: !profile[field] };
      await updateProfile(profile.id, { [field]: updated[field] });
      setProfile(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (!profile) {
    return (
      <div className="p-6 text-sm text-muted-foreground">프로필 불러오는 중...</div>
    );
  }

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-base font-semibold mb-4">내 프로필</h2>

      {/* Slack 정보 카드 */}
      <div className="rounded-lg border bg-card p-4 flex items-center gap-3 mb-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name ?? ""}
            className="h-10 w-10 rounded-full"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-base">
            {(profile.name ?? "?")[0]}
          </div>
        )}
        <div>
          <p className="text-sm font-medium">{profile.name ?? "이름 없음"}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
          {profile.slack_handle && (
            <p className="text-xs text-muted-foreground">@{profile.slack_handle}</p>
          )}
        </div>
      </div>

      {/* 동의 설정 카드 */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h3 className="text-sm font-medium">통계 공유 설정</h3>

        <ToggleRow
          label="사내 통계 공유 동의"
          description="나의 토큰 사용량이 팀 리더보드에 포함됩니다"
          checked={profile.share_consent}
          disabled={saving}
          onToggle={() => toggle("share_consent")}
        />

        <ToggleRow
          label="익명으로 표시"
          description="리더보드에 이름 대신 '익명'으로 표시됩니다"
          checked={profile.anonymized}
          disabled={saving || !profile.share_consent}
          onToggle={() => toggle("anonymized")}
        />
      </div>

      <button
        onClick={handleSignOut}
        className="mt-4 text-xs text-muted-foreground hover:text-destructive transition-colors"
      >
        로그아웃
      </button>
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
};

function ToggleRow({ label, description, checked, disabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
