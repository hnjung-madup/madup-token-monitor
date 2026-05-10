import { useRef, useState } from "react";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

interface Props {
  onSend: (body: string, imageDataUrl?: string) => Promise<void>;
  disabled?: boolean;
}

async function stripExifAndEncode(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleImage(file: File) {
    setImageError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setImageError("JPG, PNG, GIF 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("이미지는 5MB 이하만 업로드 가능합니다.");
      return;
    }
    try {
      const dataUrl = await stripExifAndEncode(file);
      setImagePreview(dataUrl);
    } catch {
      setImageError("이미지 처리 중 오류가 발생했습니다.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body && !imagePreview) return;
    setSending(true);
    try {
      await onSend(body, imagePreview ?? undefined);
      setText("");
      setImagePreview(null);
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="px-2 py-2 border-t border-hairline bg-canvas"
    >
      {imagePreview && (
        <div className="relative inline-block mb-2 ml-1">
          <img
            src={imagePreview}
            alt="미리보기"
            className="h-16 rounded-md border border-hairline"
          />
          <button
            type="button"
            onClick={() => {
              setImagePreview(null);
              if (fileRef.current) fileRef.current.value = "";
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink text-on-ink rounded-full text-[11px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
      {imageError && (
        <p className="text-[11px] text-bloom-deep mb-1 px-1">{imageError}</p>
      )}
      <div className="flex gap-1.5 items-end">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shrink-0 p-1.5 text-graphite hover:text-primary transition-colors rounded-md disabled:opacity-50"
          title="이미지 첨부"
          disabled={disabled}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImage(file);
          }}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력"
          title="Enter: 전송 · Shift+Enter: 줄바꿈"
          className="flex-1 min-w-0 resize-none rounded-md border border-hairline px-2.5 py-1.5 text-[13px] leading-5 text-ink focus:outline-none focus:border-primary transition-colors h-[34px] max-h-28 placeholder:text-graphite"
          rows={1}
          disabled={disabled || sending}
        />
        <button
          type="submit"
          disabled={disabled || sending || (!text.trim() && !imagePreview)}
          aria-label="전송"
          className="shrink-0 h-[34px] w-[34px] rounded-md bg-primary text-on-primary hover:bg-primary-bright disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8L14 2L8 14L7 9L2 8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
