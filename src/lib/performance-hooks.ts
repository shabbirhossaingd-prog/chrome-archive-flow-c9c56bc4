import { useEffect, useState } from "react";

const INTERACTION_EVENT = "zzerkoff:performance-interaction";
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
 * Defers non-critical homepage work until after the hero has had time to paint.
 * Any real user interaction releases the work immediately, so navigation,
 * search and below-fold content never feel artificially delayed.
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
    const timer = window.setTimeout(activate, delayMs);
    window.addEventListener(INTERACTION_EVENT, activate, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(INTERACTION_EVENT, activate);
    };
  }, [delayMs, enabled]);

  return enabled && ready;
}
