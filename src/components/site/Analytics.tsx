import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;

let loaded = false;

function loadAnalytics() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;

  if (GA_ID) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: false });
  }

  if (META_PIXEL_ID) {
    const fbq = function (...args: unknown[]) {
      const queue = (fbq as unknown as { queue?: unknown[] }).queue || [];
      queue.push(args);
      (fbq as unknown as { queue?: unknown[] }).queue = queue;
    };
    (fbq as unknown as { loaded?: boolean }).loaded = true;
    (fbq as unknown as { version?: string }).version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
    window.fbq("init", META_PIXEL_ID);
  }
}

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    loadAnalytics();
    const pagePath = `${location.pathname}${location.searchStr || ""}`;

    if (GA_ID && window.gtag) {
      window.gtag("event", "page_view", {
        page_path: pagePath,
        page_location: window.location.href,
        page_title: document.title,
      });
    }

    if (META_PIXEL_ID && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [location.pathname, location.searchStr]);

  return null;
}
