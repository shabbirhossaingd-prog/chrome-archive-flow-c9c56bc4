import { useEffect } from "react";

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Space+Grotesk:wght@300;400;500;700&display=swap";

export function DeferredFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-zzerkoff-fonts="true"]')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_URL;
    link.dataset.zzerkoffFonts = "true";

    const load = () => document.head.appendChild(link);
    const idle = (window as any).requestIdleCallback as
      | ((callback: () => void, options?: { timeout?: number }) => number)
      | undefined;

    if (idle) {
      const id = idle(load, { timeout: 1800 });
      return () => {
        const cancel = (window as any).cancelIdleCallback as ((id: number) => void) | undefined;
        cancel?.(id);
      };
    }

    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
