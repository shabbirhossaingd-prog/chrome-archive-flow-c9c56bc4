import { Link } from "@tanstack/react-router";
import "@/performance.css";
import { useEffect, useState } from "react";
import {
  Heart,
  Instagram,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { SmartImage } from "./SmartImage";
import { matchesSearch, useProducts } from "@/lib/products";
import { useCart, useWishlist } from "@/lib/commerce";
import { useSite } from "@/lib/settings";
import { useHomepageDeferredEnabled } from "@/lib/performance-hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "SHOP", to: "/shop" as const },
  { label: "SHOP THE LOOK", to: "/shop-the-look" as const },
  { label: "NEW COLLECTION", to: "/collection" as const },
  { label: "ARCHIVE", to: "/archive" as const },
  { label: "BLOG", to: "/blog" as const },
  { label: "ABOUT", to: "/about" as const },
  { label: "CONTACT", to: "/contact" as const },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");
  const homepageDataReady = useHomepageDeferredEnabled(true, 2200);
  const { data: products = [] } = useProducts(searchOpen);
  const site = useSite(homepageDataReady);
  const wishlist = useWishlist();
  const cart = useCart();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const results = products.filter((product) => matchesSearch(product, q));
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const iconLink =
    "relative grid size-11 place-items-center rounded-full text-muted-foreground transition-colors duration-500 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome";

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-5">
        <div
          className={cn(
            "glass-panel mx-auto flex max-w-7xl items-center gap-3 rounded-3xl px-4 py-2 transition-all duration-700 sm:px-6 sm:py-3",
            scrolled ? "bg-black/60" : "bg-black/25",
          )}
        >
          <Link
            to="/"
            aria-label="ZZERKOFF home"
            className="inline-flex min-h-11 items-center font-display text-[13px] tracking-[0.32em] text-foreground sm:text-sm"
          >
            ZZERKOFF
          </Link>

          <nav className="mx-auto hidden items-center gap-6 xl:flex" aria-label="Primary navigation">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                activeProps={{ className: "text-foreground" }}
                className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground transition-colors duration-500 hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-0.5 xl:ml-0">
            <button
              type="button"
              aria-label="Open product search"
              aria-haspopup="dialog"
              aria-expanded={searchOpen}
              aria-controls="site-search-dialog"
              onClick={() => setSearchOpen(true)}
              className={iconLink}
            >
              <Search className="size-4" aria-hidden="true" />
            </button>

            <Link to="/wishlist" aria-label={`Wishlist${wishlist.length ? `, ${wishlist.length} saved` : ""}`} className={iconLink}>
              <Heart className="size-4" aria-hidden="true" />
              {wishlist.length > 0 && (
                <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full border border-border/60 bg-black px-1 text-[7px] text-foreground" aria-hidden="true">
                  {wishlist.length}
                </span>
              )}
            </Link>

            <Link to="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`} className={iconLink}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 grid min-w-4 place-items-center rounded-full border border-border/60 bg-black px-1 text-[7px] text-foreground" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </Link>

            <Link to="/account" aria-label="Account" className={iconLink}>
              <UserRound className="size-4" aria-hidden="true" />
            </Link>

            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open ZZERKOFF Instagram in a new tab"
              className={`${iconLink} hidden sm:grid`}
            >
              <Instagram className="size-4" aria-hidden="true" />
            </a>

            <button
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-controls="site-menu-dialog"
              onClick={() => setMenuOpen(true)}
              className={`${iconLink} xl:hidden`}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          id="site-search-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-search-title"
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-2xl"
        >
          <div className="grain-overlay" />
          <div className="mx-auto flex h-full max-w-3xl flex-col px-5 pt-28 sm:px-8">
            <div className="flex items-center justify-between">
              <h2 id="site-search-title" className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
                SEARCH THE ARCHIVE
              </h2>
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
                className="grid size-11 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <label className="sr-only" htmlFor="site-search-input">
              Search products by name, code, or category
            </label>
            <input
              id="site-search-input"
              autoFocus
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="NAME / CODE / CATEGORY"
              className="mt-10 w-full border-b border-border/60 bg-transparent pb-5 font-display text-xl tracking-[0.2em] text-foreground outline-none placeholder:text-muted-foreground focus:border-chrome/60 sm:text-3xl"
            />

            <div className="mt-8 flex-1 overflow-y-auto pb-16">
              {q.trim() && results.length === 0 && (
                <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground" role="status">
                  No objects found
                </p>
              )}

              <ul className="space-y-3">
                {results.map((product) => (
                  <li key={product.id}>
                    <Link
                      to="/product/$slug"
                      params={{ slug: product.slug }}
                      aria-label={`View ${product.name}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setQ("");
                      }}
                      className="glass-panel flex items-center gap-5 rounded-2xl p-3 transition-colors hover:border-chrome/60 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome"
                    >
                      <SmartImage
                        src={product.primary_image}
                        alt={product.name}
                        width={120}
                        height={120}
                        className="size-16 shrink-0 rounded-xl object-cover grayscale"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] tracking-[0.4em] text-muted-foreground">
                          {product.product_code}
                        </span>
                        <span className="mt-1 block truncate text-[11px] uppercase tracking-[0.3em] text-foreground">
                          {product.name}
                        </span>
                      </span>
                      <span className="text-[11px] tracking-[0.2em] text-chrome">
                        {site.price(product.price)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div
          id="site-menu-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="site-menu-title"
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-2xl xl:hidden"
        >
          <div className="grain-overlay" />
          <div className="flex h-full flex-col px-5 pt-24 sm:px-8">
            <div className="flex items-center justify-between">
              <h2 id="site-menu-title" className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                Menu
              </h2>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="grid size-11 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-10 flex flex-col gap-6 overflow-y-auto pb-8" aria-label="Mobile navigation">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className="font-display text-lg tracking-[0.25em] text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome sm:text-xl"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                to="/bundles"
                onClick={() => setMenuOpen(false)}
                className="font-display text-lg tracking-[0.25em] text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome sm:text-xl"
              >
                BUNDLES
              </Link>
              <Link
                to="/wishlist"
                onClick={() => setMenuOpen(false)}
                className="font-display text-lg tracking-[0.25em] text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome sm:text-xl"
              >
                WISHLIST
              </Link>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="font-display text-lg tracking-[0.25em] text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome sm:text-xl"
              >
                ACCOUNT
              </Link>
            </nav>

            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open ZZERKOFF Instagram in a new tab"
              className="mt-auto pb-12 text-[10px] uppercase tracking-[0.45em] text-muted-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome"
            >
              INSTAGRAM {site.instagramHandle}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
