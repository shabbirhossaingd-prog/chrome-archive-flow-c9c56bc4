import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { cartItems } from "@/lib/commerce";

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
const COMMERCE_EVENT = "zzerkoff:commerce-change";
const RECENT_ORDERS_KEY = "zzerkoff:recent-orders:v1";
const TRACKED_PURCHASES_KEY = "zzerkoff:analytics-purchases:v1";

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

function trackGa(event: string, params: Record<string, unknown> = {}) {
  if (GA_ID && window.gtag) window.gtag("event", event, params);
}

function trackMeta(event: string, params: Record<string, unknown> = {}) {
  if (META_PIXEL_ID && window.fbq) window.fbq("track", event, params);
}

function snapshotCart() {
  try {
    return new Map(cartItems().map((item) => [item.key, item]));
  } catch {
    return new Map<string, any>();
  }
}

export function Analytics() {
  const location = useLocation();

  useEffect(() => {
    loadAnalytics();
    const pagePath = `${location.pathname}${location.searchStr || ""}`;

    trackGa("page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
    trackMeta("PageView");

    const productMatch = location.pathname.match(/^\/product\/([^/]+)$/);
    if (productMatch) {
      const slug = decodeURIComponent(productMatch[1] || "");
      const item = {
        item_id: slug,
        item_name: slug.replace(/-/g, " "),
      };
      trackGa("view_item", { items: [item] });
      trackMeta("ViewContent", {
        content_ids: [slug],
        content_name: item.item_name,
        content_type: "product",
      });
    }
  }, [location.pathname, location.searchStr]);

  useEffect(() => {
    loadAnalytics();
    let previous = snapshotCart();

    const onCommerceChange = () => {
      const current = snapshotCart();
      for (const [key, item] of current) {
        const before = previous.get(key);
        const beforeQty = Number(before?.quantity || 0);
        const nextQty = Number(item?.quantity || 0);
        const addedQty = Math.max(0, nextQty - beforeQty);
        if (addedQty <= 0) continue;

        const price = Number(item?.price || 0);
        trackGa("add_to_cart", {
          currency: "BDT",
          value: price * addedQty,
          items: [
            {
              item_id: item?.id || item?.code || key,
              item_name: item?.name || "ZZERKOFF object",
              price,
              quantity: addedQty,
              item_variant: [item?.color, item?.size, item?.finish]
                .filter(Boolean)
                .join(" / "),
            },
          ],
        });
        trackMeta("AddToCart", {
          content_ids: [item?.id || item?.code || key],
          content_name: item?.name || "ZZERKOFF object",
          content_type: "product",
          currency: "BDT",
          value: price * addedQty,
        });
      }
      previous = current;
    };

    window.addEventListener(COMMERCE_EVENT, onCommerceChange);
    return () => window.removeEventListener(COMMERCE_EVENT, onCommerceChange);
  }, []);

  useEffect(() => {
    loadAnalytics();
    const checkPurchases = () => {
      try {
        const recent = JSON.parse(
          localStorage.getItem(RECENT_ORDERS_KEY) || "[]",
        ) as Array<{ orderNumber?: string }>;
        const tracked = new Set<string>(
          JSON.parse(localStorage.getItem(TRACKED_PURCHASES_KEY) || "[]"),
        );
        let changed = false;

        for (const order of recent.slice(0, 8)) {
          const orderNumber = String(order?.orderNumber || "").trim();
          if (!orderNumber || tracked.has(orderNumber)) continue;
          trackGa("purchase", { transaction_id: orderNumber });
          trackMeta("Purchase", { order_id: orderNumber });
          tracked.add(orderNumber);
          changed = true;
        }

        if (changed) {
          localStorage.setItem(
            TRACKED_PURCHASES_KEY,
            JSON.stringify(Array.from(tracked).slice(-50)),
          );
        }
      } catch {
        // Analytics must never interrupt checkout.
      }
    };

    checkPurchases();
    const timer = window.setInterval(checkPurchases, 1500);
    return () => window.clearInterval(timer);
  }, []);

  return null;
}
