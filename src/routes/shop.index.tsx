import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Layers3, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
import { PageShell, PageHeading } from "@/components/site/PageShell";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { ProductGrid } from "@/components/site/ProductGrid";
import {
  customerStockLabel,
  matchesSearch,
  prettyCategory,
  useCategories,
  useProducts,
} from "@/lib/products";
import { usePage, pageJson } from "@/lib/cms";

export const Route = createFileRoute("/shop/")({
  head: () => ({
    meta: [
      { title: "Shop the Objects — ZZERKOFF" },
      {
        name: "description",
        content:
          "The ZZERKOFF object directory: rings, bracelets, chains, earrings, watches and eyewear.",
      },
      { property: "og:title", content: "Shop the Objects — ZZERKOFF" },
      {
        property: "og:description",
        content: "Objects for the afterdark. Shop the ZZERKOFF directory.",
      },
    ],
  }),
  component: ShopPage,
});

type ShopJson = {
  show_directory?: boolean;
  show_categories?: boolean;
  show_filters?: boolean;
  show_products?: boolean;
  per_section?: number;
};

const DEFAULT_FILTERS = [
  { slug: "rings", name: "RINGS" },
  { slug: "bracelets", name: "BRACELETS" },
  { slug: "chains", name: "CHAINS" },
  { slug: "earrings", name: "EARRINGS" },
  { slug: "eyewear", name: "EYEWEAR" },
  { slug: "watches", name: "WATCHES" },
];

const HIDDEN_PUBLIC_FILTERS = new Set(["pant-chain", "pant-chains"]);
const AVAILABILITY = ["ALL", "IN STOCK", "LOW STOCK", "PRE-ORDER", "SALE"] as const;
type Availability = (typeof AVAILABILITY)[number];
type SortMode = "FEATURED" | "NEWEST" | "PRICE LOW" | "PRICE HIGH";

function ShopPage() {
  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading, error } = useProducts();
  const { page } = usePage("shop");
  const json = pageJson<ShopJson>(page);
  const [active, setActive] = useState("all");
  const [availability, setAvailability] = useState<Availability>("ALL");
  const [material, setMaterial] = useState("ALL");
  const [sort, setSort] = useState<SortMode>("FEATURED");
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);

  const showDirectory = json.show_directory ?? true;
  const showCategories = json.show_categories ?? true;
  const showFilters = json.show_filters ?? true;
  const showProducts = json.show_products ?? true;

  const filters = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of DEFAULT_FILTERS) map.set(row.slug, row.name);
    for (const category of categories) {
      if (!HIDDEN_PUBLIC_FILTERS.has(category.slug)) map.set(category.slug, category.name);
    }
    for (const product of products) {
      if (!HIDDEN_PUBLIC_FILTERS.has(product.category) && !map.has(product.category)) {
        map.set(product.category, prettyCategory(product.category));
      }
    }
    return [
      { slug: "all", name: "ALL" },
      ...Array.from(map.entries()).map(([slug, name]) => ({ slug, name })),
    ];
  }, [categories, products]);

  const materials = useMemo(() => {
    const values = Array.from(
      new Set(products.map((product) => product.material?.trim()).filter(Boolean)),
    ) as string[];
    return ["ALL", ...values.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const filtered = useMemo(() => {
    const result = products.filter((product) => {
      if (active !== "all" && product.category !== active) return false;
      if (query.trim() && !matchesSearch(product, query)) return false;
      if (material !== "ALL" && product.material !== material) return false;

      const stock = customerStockLabel(product);
      if (availability === "IN STOCK" && stock !== "IN STOCK") return false;
      if (availability === "LOW STOCK" && stock !== "LOW STOCK") return false;
      if (availability === "PRE-ORDER" && stock !== "PRE-ORDER") return false;
      if (
        availability === "SALE" &&
        !(Number(product.old_price ?? 0) > Number(product.price ?? 0))
      ) {
        return false;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      if (sort === "NEWEST") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sort === "PRICE LOW") return Number(a.price) - Number(b.price);
      if (sort === "PRICE HIGH") return Number(b.price) - Number(a.price);
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });
  }, [active, availability, material, products, query, sort]);

  const pageSize = Math.max(1, Number(json.per_section ?? 15));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const visible = filtered.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);
  const activeFilter = filters.find((filter) => filter.slug === active);
  const hasAdvancedFilters =
    availability !== "ALL" || material !== "ALL" || sort !== "FEATURED" || !!query.trim();

  useEffect(() => {
    setPageIndex(0);
  }, [active, availability, material, query, sort]);

  useEffect(() => {
    if (pageIndex > totalPages - 1) setPageIndex(Math.max(0, totalPages - 1));
  }, [pageIndex, totalPages]);

  const clearAdvanced = () => {
    setAvailability("ALL");
    setMaterial("ALL");
    setSort("FEATURED");
    setQuery("");
  };

  return (
    <PageShell>
      <section className="relative isolate px-5 pt-32 sm:px-8 sm:pt-40">
        <LiquidChrome className="-left-40 top-10 h-[36rem] w-[36rem]" opacity={0.16} />
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <PageHeading
              label={page?.label || "ZZERKOFF / OBJECT DIRECTORY"}
              title={page?.title || "SHOP THE OBJECTS"}
              sub={page?.subtitle || "Published objects, live from the studio."}
            />
          </Reveal>

          {showDirectory && (
            <Reveal delay={100} className="mt-10 grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
              <Link
                to="/shop-the-look"
                className="glass-panel flex items-center gap-4 rounded-[22px] p-4 transition-colors hover:border-chrome/50"
              >
                <ScanLine className="size-5 text-muted-foreground" />
                <div>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Styling</span>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-foreground">Shop the Look</p>
                </div>
              </Link>
              <Link
                to="/bundles"
                className="glass-panel flex items-center gap-4 rounded-[22px] p-4 transition-colors hover:border-chrome/50"
              >
                <Layers3 className="size-5 text-muted-foreground" />
                <div>
                  <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">Curated</span>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-foreground">Bundle Sets</p>
                </div>
              </Link>
            </Reveal>
          )}
        </div>
      </section>

      <section className="relative px-5 py-14 sm:px-8 sm:py-22">
        <div className="mx-auto max-w-7xl">
          {(showCategories || showFilters) && (
            <>
              <Reveal className="glass-panel rounded-[22px] p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/45 pb-3">
                  <div>
                    <span className="text-[7px] uppercase tracking-[0.34em] text-muted-foreground sm:text-[8px]">
                      {showCategories ? "ALL CATEGORIES" : "FILTERS"}
                    </span>
                    {showCategories && (
                      <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-muted-foreground/75">
                        {activeFilter?.name || "ALL"} selected
                      </p>
                    )}
                  </div>
                  {showFilters && (
                    <button
                      type="button"
                      onClick={() => setFiltersOpen((value) => !value)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[7px] uppercase tracking-[0.2em] transition-colors sm:text-[8px] ${
                        filtersOpen || hasAdvancedFilters
                          ? "border-chrome/60 bg-white/[0.05] text-foreground"
                          : "border-border/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <SlidersHorizontal className="size-3" />
                      Filters
                      {hasAdvancedFilters ? " · ON" : ""}
                    </button>
                  )}
                </div>

                {showCategories && (
                  <div className="-mx-1 mt-3 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {filters.map((filter) => {
                      const isActive = active === filter.slug;
                      return (
                        <button
                          key={filter.slug}
                          type="button"
                          onClick={() => setActive(filter.slug)}
                          className={`relative inline-flex h-7 shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 text-[7px] uppercase tracking-[0.14em] transition-colors duration-300 sm:h-8 sm:px-3.5 sm:text-[8px] ${
                            isActive
                              ? "border-chrome/60 bg-white/[0.055] text-foreground"
                              : "border-border/45 text-muted-foreground hover:border-chrome/35 hover:text-chrome"
                          }`}
                        >
                          {filter.name}
                          {isActive && (
                            <span className="absolute inset-x-3 bottom-0.5 h-px rounded-full bg-chrome/80" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Reveal>

              {showFilters && filtersOpen && (
                <Reveal className="glass-panel mt-4 rounded-[24px] p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
                    <label className="block">
                      <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Search</span>
                      <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
                        <Search className="size-4 text-muted-foreground" />
                        <input
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Name / code / tag"
                          className="min-w-0 flex-1 bg-transparent text-[10px] uppercase tracking-[0.18em] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Availability</span>
                      <select
                        value={availability}
                        onChange={(event) => setAvailability(event.target.value as Availability)}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-black px-4 py-3 text-[9px] uppercase tracking-[0.22em] text-foreground outline-none"
                      >
                        {AVAILABILITY.map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Material</span>
                      <select
                        value={material}
                        onChange={(event) => setMaterial(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-black px-4 py-3 text-[9px] uppercase tracking-[0.22em] text-foreground outline-none"
                      >
                        {materials.map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">Sort</span>
                      <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value as SortMode)}
                        className="mt-2 w-full rounded-xl border border-border/60 bg-black px-4 py-3 text-[9px] uppercase tracking-[0.22em] text-foreground outline-none"
                      >
                        {(["FEATURED", "NEWEST", "PRICE LOW", "PRICE HIGH"] as SortMode[]).map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                    <span className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                      {filtered.length} OBJECT{filtered.length === 1 ? "" : "S"}
                    </span>
                    {hasAdvancedFilters && (
                      <button
                        type="button"
                        onClick={clearAdvanced}
                        className="inline-flex items-center gap-2 text-[8px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" /> Clear
                      </button>
                    )}
                  </div>
                </Reveal>
              )}
            </>
          )}

          {showProducts && (
            <>
              <Reveal className="mt-9 flex flex-wrap items-end justify-between gap-3 border-b border-border/45 pb-4">
                <div>
                  <span className="text-[8px] uppercase tracking-[0.38em] text-muted-foreground">ALL PRODUCTS</span>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-foreground">
                    {activeFilter?.name || "ALL"} · {filtered.length} OBJECT{filtered.length === 1 ? "" : "S"}
                  </p>
                </div>
              </Reveal>

              {error ? (
                <div className="glass-panel mt-8 rounded-[24px] p-8 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                    The object directory could not load. Try refreshing.
                  </p>
                </div>
              ) : (
                <div className="mt-8">
                  <ProductGrid
                    products={visible}
                    loading={isLoading}
                    priorityCount={2}
                    empty="No objects match these filters."
                  />
                  {filtered.length > pageSize && (
                    <div className="mt-8 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
                        disabled={safePageIndex === 0}
                        className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-chrome/45 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Previous products"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">
                        {safePageIndex + 1} / {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPageIndex((value) => Math.min(totalPages - 1, value + 1))}
                        disabled={safePageIndex >= totalPages - 1}
                        className="inline-flex size-10 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-chrome/45 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Next products"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}
