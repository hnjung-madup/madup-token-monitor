import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  src: string | null | undefined;
  name: string;
  size?: number;
  rounded?: "full" | "md";
  className?: string;
  title?: string;
}

/// 4-light signal palette gradient pairs. seed-hash 로 안정적으로 1개 선택.
const GRADIENTS: [string, string, string][] = [
  ["#4DA3FF", "#B68CFF", "#06122B"], // azure → violet (default)
  ["#7BBCFF", "#2C7BE5", "#06122B"], // azure-bright → azure-deep
  ["#B68CFF", "#8358D9", "#06122B"], // violet → violet-deep
  ["#9BE15D", "#6CB23B", "#06170A"], // lime
  ["#F5B544", "#C88A1C", "#1a1206"], // amber
  ["#FF6B5C", "#D43F2E", "#3a0c08"], // coral
  ["#7BBCFF", "#B68CFF", "#06122B"],
];

function hashIdx(seed: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++)
    hash = (hash << 5) - hash + seed.charCodeAt(i);
  return Math.abs(hash) % mod;
}

export function Avatar({
  src,
  name,
  size = 32,
  rounded = "full",
  className,
  title,
}: Props) {
  const [errored, setErrored] = useState(false);
  const initial = (name?.trim() || "?").charAt(0).toUpperCase();
  const radius = rounded === "full" ? "rounded-full" : "rounded-md";
  const showImage = src && !errored;

  if (showImage) {
    return (
      <img
        src={src!}
        alt={name}
        title={title ?? name}
        width={size}
        height={size}
        onError={() => setErrored(true)}
        className={cn(`${radius} object-cover shrink-0`, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  const [from, to, fg] = GRADIENTS[hashIdx(name || "?", GRADIENTS.length)];
  return (
    <span
      title={title ?? name}
      className={cn(
        `${radius} inline-flex items-center justify-center font-bold shrink-0`,
        className,
      )}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        color: fg,
        fontSize: Math.max(11, Math.floor(size * 0.42)),
      }}
    >
      {initial}
    </span>
  );
}
