import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Clock3, X } from "lucide-react";
import { SmartImage } from "./SmartImage";
import {
  customerStockLabel,
  formatPrice,
  isSoldOut,
  type Product,
  useProducts,
} from "@/lib/products";

const STORAGE_KEY = "zzerkoff:recently-viewed-v1";
const MAX_RECENT = 8;

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

function focusBuyArea() {
  if (typeof document === "undefined") return;
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("button, a"));
  const target = candidates.find((node) =>
    /place order|add to cart|ask about restock|pre-order/i.test(node.textContent || ""),
  );
  target?.scrollIntoView({ behavior: "smooth", block: "center" });
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
        <div className="fixed inset-x-3 bottom-3 z-[55] sm:hidden">
          <div className="flex items-center gap-3 rounded-2xl border border-chrome/35 bg-black/90 p-3 shadow-2xl backdrop-blur-xl">
            <div className="min-w-0 flex-1 pl-1">
              <p className="truncate text-[9px] uppercase tracking-[0.22em] text-foreground">
                {product.name}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[8px] uppercase tracking-[0.22em]">
                <span className="text-chrome">{formatPrice(product.price)}</span>
                <span className="text-muted-foreground">{stockLabel}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={focusBuyArea}
              className="shrink-0 rounded-xl border border-chrome/50 bg-white/[0.05] px-4 py-3 text-[8px] uppercase tracking-[0.24em] text-foreground"
            >
              {soldOut ? "RESTOCK" : stockLabel === "PRE-ORDER" ? "PRE-ORDER" : "BUY"}
            </button>
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
