import type { Message } from "../../hooks/useMessages";

interface Props {
  message: Message;
  isMine: boolean;
  onDelete?: (id: string) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({ message, isMine, onDelete }: Props) {
  const displayName =
    message.user_name ?? message.user_email.split("@")[0];

  return (
    <div
      className={`flex gap-2 mb-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        title={message.user_email}
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
      <div className={`max-w-[70%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {!isMine && (
          <span className="text-xs text-gray-500 mb-1">{displayName}</span>
        )}
        <div
          className={`px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
            isMine
              ? "bg-blue-500 text-white rounded-tr-sm"
              : "bg-gray-100 text-gray-900 rounded-tl-sm"
          }`}
        >
          {message.image_url && (
            <img
              src={message.image_url}
              alt="첨부 이미지"
              className="max-w-full rounded-lg mb-1"
              style={{ maxHeight: 240 }}
            />
          )}
          {message.body}
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-400">{formatTime(message.created_at)}</span>
          {isMine && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="삭제"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
