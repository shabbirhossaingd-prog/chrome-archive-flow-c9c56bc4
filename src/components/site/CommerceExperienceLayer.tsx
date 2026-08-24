import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, ShoppingBag, X } from "lucide-react";
import { SmartImage } from "./SmartImage";
import { supabase } from "@/integrations/supabase/client";
import {
  customerStockLabel,
  formatPrice,
  isSoldOut,
  type Product,
  useProducts,
} from "@/lib/products";

const STORAGE_KEY = "zzerkoff:recently-viewed-v1";
const MAX_RECENT = 8;
const STORAGE_PREFIX = "storage:";

function readRecent() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT)
      : [];
  } catch {
    return [] as string[];
  }
}

function findStorefrontAction(pattern: RegExp) {
  if (typeof document === "undefined") return null;
  return Array.from(document.querySelectorAll<HTMLElement>("button, a")).find((node) => {
    if (node.closest('[data-zzerkoff-mobile-buybar="true"]')) return false;
    return pattern.test((node.textContent || "").trim());
  }) ?? null;
}

function triggerProductAction(kind: "order" | "cart" | "restock") {
  const pattern =
    kind === "order"
      ? /place order/i
      : kind === "cart"
        ? /add to cart/i
        : /ask about restock/i;
  const target = findStorefrontAction(pattern);
  if (!target) return;
  target.click();
}

export function CommerceExperienceLayer() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const privateScreen = pathname.startsWith("/admin") || pathname.startsWith("/erp");
  const productSlug = pathname.startsWith("/product/")
    ? decodeURIComponent(pathname.slice("/product/".length).split("/")[0] || "")
    : "";
  const isProductPage = !!productSlug && !privateScreen;
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const { data: products = [] } = useProducts(isProductPage || (recentOpen && !privateScreen));

  const product = isProductPage
    ? products.find((row) => row.slug === productSlug) ?? null
    : null;

  useEffect(() => {
    if (privateScreen) {
      setRecentOpen(false);
      setRecentSlugs([]);
      return;
    }
    setRecentSlugs(readRecent());
  }, [pathname, privateScreen]);

  useEffect(() => {
    if (!product) return;
    const next = [product.slug, ...readRecent().filter((slug) => slug !== product.slug)].slice(
      0,
      MAX_RECENT,
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRecentSlugs(next);
  }, [product?.id]);

  // Some older storefront sections still use a raw <img> with the storage:
  // reference created by the admin uploader. Resolve those refs centrally so
  // they never render as a broken image while those sections are migrated to
  // SmartImage.
  useEffect(() => {
    if (privateScreen || typeof document === "undefined") return;

    let cancelled = false;

    const repairImage = async (img: HTMLImageElement) => {
      const src = img.getAttribute("src") || "";
      if (!src.startsWith(STORAGE_PREFIX) || img.dataset.zzStorageRepair === "pending") return;

      img.dataset.zzStorageRepair = "pending";
      img.style.visibility = "hidden";
      const path = src.slice(STORAGE_PREFIX.length);

      try {
        const { data, error } = await supabase.storage
          .from("product-images")
          .createSignedUrl(path, 60 * 60);

        if (cancelled) return;
        if (error || !data?.signedUrl) {
          img.dataset.zzStorageRepair = "failed";
          img.style.visibility = "visible";
          return;
        }

        img.src = data.signedUrl;
        img.dataset.zzStorageRepair = "done";
        img.style.visibility = "visible";
      } catch {
        if (!cancelled) {
          img.dataset.zzStorageRepair = "failed";
          img.style.visibility = "visible";
        }
      }
    };

    const scan = () => {
      document
        .querySelectorAll<HTMLImageElement>('img[src^="storage:"]')
        .forEach((img) => void repairImage(img));
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [pathname, privateScreen]);

  // Public UI must never reveal exact inventory numbers. Keep inventory for
  // purchase validation, but remove legacy count labels from the rendered UI.
  useEffect(() => {
    if (!isProductPage || typeof document === "undefined") return;

    const scrub = () => {
      document.querySelectorAll<HTMLElement>("span").forEach((node) => {
        const text = (node.textContent || "").trim();
        if (/^\d+\s+available$/i.test(text)) node.style.display = "none";
        if (
          /^\d+$/.test(text) &&
          node.classList.contains("ml-2") &&
          node.classList.contains("opacity-55")
        ) {
          node.style.display = "none";
        }
      });
    };

    scrub();
    const observer = new MutationObserver(scrub);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isProductPage, pathname]);

  // Purchase actions should appear before long description/detail accordions.
  // This keeps the main conversion controls close to size/finish/quantity on
  // both desktop and mobile without duplicating product business logic.
  useEffect(() => {
    if (!isProductPage || typeof document === "undefined") return;

    const promoteActions = () => {
      const primaryAction = findStorefrontAction(/place order|ask about restock/i);
      const actionBlock = primaryAction?.parentElement;
      if (!actionBlock) return;

      const descriptionToggle = document.querySelector<HTMLElement>(
        '[data-zzerkoff-description-toggle="true"]',
      );

      if (
        descriptionToggle &&
        descriptionToggle.parentElement &&
        actionBlock.parentElement === descriptionToggle.parentElement &&
        descriptionToggle.previousElementSibling !== actionBlock
      ) {
        actionBlock.classList.remove("mt-10");
        actionBlock.classList.add("mt-8", "mb-2");
        descriptionToggle.parentElement.insertBefore(actionBlock, descriptionToggle);
        return;
      }

      const detailsTrigger = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
        (button) => (button.textContent || "").trim().toUpperCase() === "DETAILS",
      );
      if (!detailsTrigger || !actionBlock.parentElement) return;

      let sectionRoot: HTMLElement | null = detailsTrigger.parentElement;
      while (sectionRoot && sectionRoot.parentElement !== actionBlock.parentElement) {
        sectionRoot = sectionRoot.parentElement;
      }

      if (
        sectionRoot &&
        sectionRoot.parentElement === actionBlock.parentElement &&
        sectionRoot.previousElementSibling !== actionBlock
      ) {
        actionBlock.classList.remove("mt-10");
        actionBlock.classList.add("mt-8", "mb-2");
        sectionRoot.parentElement.insertBefore(actionBlock, sectionRoot);
      }
    };

    const timer = window.setTimeout(promoteActions, 0);
    const observer = new MutationObserver(promoteActions);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [isProductPage, pathname]);

  const recentProducts = useMemo(
    () =>
      recentSlugs
        .filter((slug) => slug !== productSlug)
        .map((slug) => products.find((row) => row.slug === slug))
        .filter((row): row is Product => !!row)
        .slice(0, 4),
    [productSlug, products, recentSlugs],
  );

  const stockLabel = product ? customerStockLabel(product) : "";
  const soldOut = product ? isSoldOut(product) : false;

  if (privateScreen) return null;

  return (
    <>
      {product && (
        <div
          data-zzerkoff-mobile-buybar="true"
          className="fixed inset-x-3 bottom-3 z-[55] sm:hidden"
        >
          <div className="flex items-center gap-2 rounded-2xl border border-chrome/35 bg-black/92 p-2.5 shadow-2xl backdrop-blur-xl">
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-[8px] uppercase tracking-[0.2em] text-foreground">
                {product.name}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[7px] uppercase tracking-[0.18em]">
                <span className="text-chrome">{formatPrice(product.price)}</span>
                <span className="truncate text-muted-foreground">{stockLabel}</span>
              </div>
            </div>

            {soldOut ? (
              <button
                type="button"
                onClick={() => triggerProductAction("restock")}
                className="shrink-0 rounded-xl border border-chrome/50 bg-white/[0.05] px-4 py-3 text-[7px] uppercase tracking-[0.22em] text-foreground"
              >
                RESTOCK
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerProductAction("order")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-chrome/60 bg-white/[0.06] px-3 py-3 text-[7px] uppercase tracking-[0.2em] text-foreground"
                >
                  {stockLabel === "PRE-ORDER" ? "PRE-ORDER" : "ORDER"}
                  <ArrowUpRight className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Add to cart"
                  onClick={() => triggerProductAction("cart")}
                  className="grid size-10 place-items-center rounded-xl border border-border/60 text-muted-foreground transition-colors active:border-chrome/60 active:text-foreground"
                >
                  <ShoppingBag className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {recentSlugs.length > (isProductPage ? 1 : 0) && (
        <button
          type="button"
          onClick={() => setRecentOpen(true)}
          className={`fixed right-4 z-[54] inline-flex items-center gap-2 rounded-full border border-border/60 bg-black/80 px-4 py-3 text-[8px] uppercase tracking-[0.26em] text-muted-foreground backdrop-blur-xl transition-colors hover:border-chrome/50 hover:text-foreground ${
            isProductPage ? "bottom-24 sm:bottom-6" : "bottom-5"
          }`}
        >
          <Clock3 className="size-3.5" />
          Recent
        </button>
      )}

      {recentOpen && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-xl">
          <button
            type="button"
            aria-label="Close recently viewed"
            onClick={() => setRecentOpen(false)}
            className="absolute inset-0"
          />
          <aside className="absolute inset-x-3 bottom-3 max-h-[78vh] overflow-y-auto rounded-[26px] border border-border/60 bg-black p-5 shadow-2xl sm:inset-x-auto sm:right-5 sm:top-5 sm:bottom-auto sm:w-[420px]">
            <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
              <div>
                <span className="text-[8px] uppercase tracking-[0.38em] text-muted-foreground">
                  ZZ / MEMORY
                </span>
                <h2 className="mt-2 font-display text-sm tracking-[0.2em] text-foreground">
                  RECENTLY VIEWED
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRecentOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-border/60 text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentProducts.length === 0 ? (
                <p className="py-8 text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                  No previous objects yet
                </p>
              ) : (
                recentProducts.map((row) => (
                  <Link
                    key={row.id}
                    to="/product/$slug"
                    params={{ slug: row.slug }}
                    onClick={() => setRecentOpen(false)}
                    className="flex items-center gap-4 rounded-2xl border border-border/45 p-3 transition-colors hover:border-chrome/50"
                  >
                    <SmartImage
                      src={row.primary_image}
                      alt={row.name}
                      width={120}
                      height={150}
                      className="h-20 w-16 shrink-0 rounded-xl object-cover grayscale"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[9px] uppercase tracking-[0.24em] text-foreground">
                        {row.name}
                      </span>
                      <span className="mt-2 block text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
                        {customerStockLabel(row)}
                      </span>
                    </span>
                    <span className="text-[9px] tracking-[0.16em] text-chrome">
                      {formatPrice(row.price)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
