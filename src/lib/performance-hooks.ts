import { useEffect, useState } from "react";

const INTERACTION_EVENT = "zzerkoff:performance-interaction";
const HOMEPAGE_MIN_DELAY_MS = 5200;
let interactionSeen = false;
let trackingInstalled = false;

function installInteractionTracking() {
  if (trackingInstalled || typeof window === "undefined") return;
  trackingInstalled = true;

  const markInteraction = () => {
    if (interactionSeen) return;
    interactionSeen = true;
    window.dispatchEvent(new Event(INTERACTION_EVENT));
  };

  window.addEventListener("pointerdown", markInteraction, { passive: true, capture: true });
  window.addEventListener("keydown", markInteraction, { capture: true });
  window.addEventListener("scroll", markInteraction, { passive: true, capture: true });
}

/**
 * Keeps non-critical homepage network work out of the initial hero paint.
 * Real interaction (scroll, tap or key press) releases it immediately, so
 * customers never wait when they actually start using the page.
 */
export function useHomepageDeferredEnabled(enabled = true, delayMs = 2200) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    if (typeof window === "undefined") return;
    installInteractionTracking();

    if (window.location.pathname !== "/" || interactionSeen) {
      setReady(true);
      return;
    }

    const activate = () => setReady(true);
    const timer = window.setTimeout(
      activate,
      Math.max(delayMs, HOMEPAGE_MIN_DELAY_MS),
    );
    window.addEventListener(INTERACTION_EVENT, activate, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INTERACTION_EVENT, activate);
    };
  }, [delayMs, enabled]);

  return enabled && ready;
}
