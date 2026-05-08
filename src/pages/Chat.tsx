import { useEffect, useRef, useState } from "react";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "../components/chat/MessageBubble";
import { MessageInput } from "../components/chat/MessageInput";
import { supabase } from "../lib/supabase";
import { useAuthUser } from "../hooks/useAuthUser";
import { Avatar } from "../components/Avatar";

const CHANNELS = ["general", "dev", "random"];

export default function Chat() {
  const [channel, setChannel] = useState("general");
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.id ?? null;
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, loading, error, sendMessage, deleteMessage } =
    useMessages(channel);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(body: string, imageDataUrl?: string) {
    if (!body.trim() && !imageDataUrl) return;
    const { error: err } = await sendMessage(body, imageDataUrl);
    if (err) console.error("메시지 전송 실패:", err);
  }

  async function handleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: "slack_oidc",
      options: { redirectTo: window.location.href },
    });
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full text-graphite text-sm">
        로딩 중...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="px-10 py-16 max-w-[1366px] mx-auto">
        <section className="hp-card-cloud p-14 text-center">
          <p className="hp-eyebrow mb-3">Team Chat</p>
          <h2 className="hp-display-md text-ink mb-3">로그인이 필요합니다</h2>
          <p className="hp-body text-charcoal mb-8 max-w-md mx-auto">
            팀 채널에서 동료와 토큰 사용 패턴, MCP 팁을 공유하려면 Slack으로 로그인하세요.
          </p>
          <button onClick={handleSignIn} className="hp-btn-primary">
            Sign in with Slack
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-canvas">
      {/* Channel sidebar — ink slab */}
      <aside className="w-48 bg-ink text-on-ink flex flex-col py-6">
        <p className="px-5 mb-4 text-[10px] tracking-[0.18em] uppercase font-bold text-on-ink/60">
          Channels
        </p>
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`text-left px-5 py-2 text-[14px] transition-colors ${
              ch === channel
                ? "bg-ink-soft text-on-ink font-semibold border-l-[3px] border-primary"
                : "text-on-ink/70 hover:bg-ink-soft border-l-[3px] border-transparent"
            }`}
          >
            # {ch}
          </button>
        ))}
      </aside>

      <div className="flex flex-col flex-1 min-h-0 bg-canvas">
        <div className="px-6 py-4 border-b border-hairline bg-canvas flex items-center justify-between gap-4">
          <div>
            <p className="hp-caption-sm uppercase tracking-[0.18em] font-bold text-graphite">
              팀 채팅
            </p>
            <h2 className="hp-display-xs text-ink mt-1"># {channel}</h2>
          </div>
          {user && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full border border-hairline bg-cloud">
              <Avatar src={user.avatarUrl} name={user.name} size={28} rounded="full" />
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-ink">{user.name}</p>
                {user.slackHandle && (
                  <p className="text-[11px] text-graphite">@{user.slackHandle}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 bg-canvas">
          {loading && (
            <p className="hp-caption text-graphite text-center">
              메시지 로딩 중...
            </p>
          )}
          {error && (
            <p className="hp-caption text-bloom-deep text-center">오류: {error}</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="hp-caption text-graphite text-center">
              아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </p>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.user_id === userId}
              myAvatarUrl={user?.avatarUrl ?? null}
              onDelete={
                msg.user_id === userId ? (id) => deleteMessage(id) : undefined
              }
            />
          ))}
          <div ref={bottomRef} />
        </div>

        <MessageInput onSend={handleSend} disabled={!userId} />
      </div>
    </div>
  );
}
