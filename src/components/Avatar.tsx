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

const PALETTE = [
  "#024ad8", // primary
  "#0e3191", // primary-deep
  "#296ef9", // primary-bright
  "#1a1a1a", // ink
  "#356373", // storm-deep
  "#7fadbe", // storm-sea
  "#b3262b", // bloom-deep
];

function hashColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  src,
  name,
  size = 32,
  rounded = "md",
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

  return (
    <span
      title={title ?? name}
      className={cn(
        `${radius} inline-flex items-center justify-center text-on-primary font-bold shrink-0`,
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: hashColor(name || "?"),
        fontSize: Math.max(11, Math.floor(size * 0.42)),
      }}
    >
      {initial}
    </span>
  );
}
