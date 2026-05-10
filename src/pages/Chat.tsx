import { useEffect, useRef } from "react";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "../components/chat/MessageBubble";
import { MessageInput } from "../components/chat/MessageInput";
import { supabase } from "../lib/supabase";
import { useAuthUser } from "../hooks/useAuthUser";

const CHANNEL = "general";

export default function Chat() {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.id ?? null;
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, loading, error, sendMessage, deleteMessage } =
    useMessages(CHANNEL);

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
      <div className="px-4 py-8 max-w-full">
        <section className="hp-card-cloud p-6 text-center">
          <p className="hp-eyebrow mb-2">Team Chat</p>
          <h2 className="hp-display-xs text-ink mb-2">로그인이 필요합니다</h2>
          <p className="hp-caption text-charcoal mb-4">
            Slack으로 로그인하면 #general 채널에서 동료와 대화할 수 있습니다.
          </p>
          <button onClick={handleSignIn} className="hp-btn-primary">
            Sign in with Slack
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-canvas min-h-0">
      <header className="px-4 py-2 border-b border-hairline flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink"># general</h2>
        <span className="text-[10px] text-graphite">{messages.length}개</span>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {loading && (
          <p className="hp-caption text-graphite text-center py-4">메시지 로딩 중...</p>
        )}
        {error && (
          <p className="hp-caption text-bloom-deep text-center py-4">오류: {error}</p>
        )}
        {!loading && messages.length === 0 && (
          <p className="hp-caption text-graphite text-center py-8">
            아직 메시지가 없습니다.<br />첫 메시지를 보내보세요.
          </p>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.user_id === userId}
            myAvatarUrl={user?.avatarUrl ?? null}
            onDelete={msg.user_id === userId ? (id) => deleteMessage(id) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} disabled={!userId} />
    </div>
  );
}
