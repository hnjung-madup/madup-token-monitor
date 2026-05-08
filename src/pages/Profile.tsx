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
      <div className="px-10 py-10 hp-caption text-graphite">
        프로필 불러오는 중...
      </div>
    );
  }

  return (
    <div className="px-10 py-10 max-w-[920px] mx-auto space-y-8">
      <header>
        <p className="hp-eyebrow mb-3">Profile</p>
        <h1 className="hp-display-lg text-ink">내 프로필</h1>
      </header>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-8 flex items-center gap-5">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.name ?? ""}
            className="h-16 w-16 rounded-lg object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-lg bg-cloud flex items-center justify-center hp-display-sm text-ink font-bold">
            {(profile.name ?? "?")[0]}
          </div>
        )}
        <div>
          <p className="hp-display-xs text-ink">{profile.name ?? "이름 없음"}</p>
          <p className="hp-caption text-graphite mt-1">{profile.email}</p>
          {profile.slack_handle && (
            <p className="hp-caption text-graphite">@{profile.slack_handle}</p>
          )}
        </div>
      </section>

      <section className="hp-card-flat shadow-[0_2px_8px_rgba(26,26,26,0.06)] p-8 space-y-6">
        <div>
          <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-graphite mb-1">
            Stats Sharing
          </p>
          <h2 className="hp-display-xs text-ink">통계 공유 설정</h2>
        </div>

        <ToggleRow
          label="사내 통계 공유 동의"
          description="나의 토큰 사용량이 팀 리더보드에 포함됩니다"
          checked={profile.share_consent}
          disabled={saving}
          onToggle={() => toggle("share_consent")}
        />

        <div className="border-t border-hairline" />

        <ToggleRow
          label="익명으로 표시"
          description="리더보드에 이름 대신 '익명'으로 표시됩니다"
          checked={profile.anonymized}
          disabled={saving || !profile.share_consent}
          onToggle={() => toggle("anonymized")}
        />
      </section>

      <button
        onClick={handleSignOut}
        className="hp-caption uppercase tracking-[0.18em] font-bold text-graphite hover:text-bloom-deep transition-colors"
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
    <div className="flex items-center justify-between gap-6">
      <div className="flex-1">
        <p className="hp-body-emphasis text-ink">{label}</p>
        <p className="hp-caption text-graphite mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? "bg-primary" : "bg-fog"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 mt-0.5 rounded-full bg-canvas shadow-md transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
