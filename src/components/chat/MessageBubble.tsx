import type { Message } from "../../hooks/useMessages";
import { Avatar } from "../Avatar";

interface Props {
  message: Message;
  isMine: boolean;
  myAvatarUrl?: string | null;
  onDelete?: (id: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isMine, myAvatarUrl, onDelete }: Props) {
  const displayName = message.user_name ?? message.user_email.split("@")[0];
  const avatarUrl = isMine ? myAvatarUrl ?? null : null;

  return (
    <div className={`flex gap-3 mb-4 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar
        src={avatarUrl}
        name={displayName}
        size={36}
        rounded="md"
        title={message.user_email}
      />
      <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        <span className="text-[12px] font-semibold text-charcoal mb-1 flex items-center gap-1">
          {displayName}
          {isMine && (
            <span className="text-[9px] tracking-[0.16em] uppercase font-bold text-primary px-1 py-0.5 rounded bg-primary-soft">
              나
            </span>
          )}
        </span>
        <div
          className={`px-4 py-2.5 rounded-lg text-[14px] break-words whitespace-pre-wrap leading-relaxed ${
            isMine
              ? "bg-primary text-on-primary rounded-tr-[2px]"
              : "bg-cloud text-ink rounded-tl-[2px] border border-hairline"
          }`}
        >
          {message.image_url && (
            <img
              src={message.image_url}
              alt="첨부 이미지"
              className="max-w-full rounded-md mb-1"
              style={{ maxHeight: 240 }}
            />
          )}
          {message.body}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-graphite">{formatTime(message.created_at)}</span>
          {isMine && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="text-[11px] text-graphite hover:text-bloom-deep transition-colors"
              title="삭제"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
