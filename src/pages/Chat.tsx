import { useEffect, useRef, useState } from "react";
import { useMessages } from "../hooks/useMessages";
import { MessageBubble } from "../components/chat/MessageBubble";
import { MessageInput } from "../components/chat/MessageInput";
import { supabase } from "../lib/supabase";

const CHANNELS = ["general", "dev", "random"];

export default function Chat() {
  const [channel, setChannel] = useState("general");
  const [userId, setUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, loading, error, sendMessage, deleteMessage } =
    useMessages(channel);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-scroll on new messages
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
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        로딩 중...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-gray-600">팀 채팅을 사용하려면 Slack으로 로그인하세요.</p>
        <button
          onClick={handleSignIn}
          className="px-6 py-2 bg-[#4A154B] text-white rounded-lg font-medium hover:bg-[#3d1140] transition-colors"
        >
          Slack으로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar: channel list */}
      <aside className="w-40 bg-gray-900 text-gray-300 flex flex-col py-4">
        <div className="px-3 mb-2 text-xs font-semibold uppercase text-gray-500 tracking-wider">
          채널
        </div>
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setChannel(ch)}
            className={`text-left px-3 py-1.5 text-sm hover:bg-gray-700 transition-colors ${
              ch === channel
                ? "bg-gray-700 text-white font-medium"
                : "text-gray-400"
            }`}
          >
            # {ch}
          </button>
        ))}
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-2">
          <span className="font-semibold text-gray-800"># {channel}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-white">
          {loading && (
            <p className="text-sm text-gray-400 text-center">메시지 로딩 중...</p>
          )}
          {error && (
            <p className="text-sm text-red-500 text-center">
              오류: {error}
            </p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center">
              아직 메시지가 없습니다. 첫 메시지를 보내보세요!
            </p>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.user_id === userId}
              onDelete={
                msg.user_id === userId
                  ? (id) => deleteMessage(id)
                  : undefined
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
