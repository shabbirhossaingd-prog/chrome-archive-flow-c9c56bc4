import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import chromeBlob from "@/assets/chrome-blob.webp";
import "@/performance.css";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** 0 - 1 */
  opacity?: number;
  flip?: boolean;
  blur?: number;
  /** Load the decorative bitmap after the first paint. */
  defer?: boolean;
  /** Use only for the first above-the-fold chrome visual. */
  priority?: boolean;
};

/** Reusable decorative liquid chrome fragment. Purely presentational. */
export function LiquidChrome({
  className,
  opacity = 0.22,
  flip = false,
  blur = 22,
  defer = true,
  priority = false,
}: Props) {
  const shouldDefer = defer && !priority;
  const [ready, setReady] = useState(!shouldDefer);

  useEffect(() => {
    if (!shouldDefer) return;
    const timer = window.setTimeout(() => setReady(true), 900);
    return () => window.clearTimeout(timer);
  }, [shouldDefer]);

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute -z-10 select-none", className)}
    >
      <div
        className="liquid-chrome-placeholder h-full w-full"
        style={
          {
            opacity: ready ? 0 : Math.min(opacity * 0.45, 0.12),
            transform: flip ? "scaleX(-1)" : undefined,
            "--liquid-blur": `${blur}px`,
          } as CSSProperties
        }
      />
      {ready && (
        <img
          src={chromeBlob}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className="liquid-chrome-image absolute inset-0 h-full w-full object-cover animate-drift"
          style={
            {
              opacity,
              "--liquid-blur": `${blur}px`,
              transform: flip ? "scaleX(-1)" : undefined,
              maskImage:
                "radial-gradient(closest-side, #000 18%, rgba(0,0,0,0.45) 55%, transparent 92%)",
              WebkitMaskImage:
                "radial-gradient(closest-side, #000 18%, rgba(0,0,0,0.45) 55%, transparent 92%)",
              mixBlendMode: "screen",
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}

export function GrainField() {
  return <div aria-hidden className="grain-overlay -z-10" />;
}
