import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layers3, ScanLine, Search, SlidersHorizontal, X } from "lucide-react";
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
          "The ZZERKOFF object directory: rings, bracelets, chains, pant chains, earrings and eyewear.",
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
  show_filters?: boolean;
  per_section?: number;
};

const DEFAULT_FILTERS = [
  { slug: "rings", name: "RINGS" },
  { slug: "bracelets", name: "BRACELETS" },
  { slug: "chains", name: "CHAINS" },
  { slug: "pant-chains", name: "PANT CHAINS" },
  { slug: "earrings", name: "EARRINGS" },
  { slug: "eyewear", name: "EYEWEAR" },
];

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

  const filters = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of DEFAULT_FILTERS) map.set(row.slug, row.name);
    for (const category of categories) map.set(category.slug, category.name);
    for (const product of products) {
      if (!map.has(product.category)) {
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

  const visible = filtered.slice(0, Math.max(1, Number(json.per_section ?? 100)));
  const hasAdvancedFilters =
    availability !== "ALL" || material !== "ALL" || sort !== "FEATURED" || !!query.trim();

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
        </div>
      </section>

      <section className="relative px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          {(json.show_filters ?? true) && (
            <>
              <Reveal className="border-y border-border/50 py-5">
                <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:flex-wrap">
                  {filters.map((filter) => (
                    <button
                      key={filter.slug}
                      type="button"
                      onClick={() => setActive(filter.slug)}
                      className={`shrink-0 text-[10px] uppercase tracking-[0.34em] transition-colors duration-500 ${
                        active === filter.slug
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-chrome"
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFiltersOpen((value) => !value)}
                    className={`ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] uppercase tracking-[0.28em] transition-colors ${
                      filtersOpen || hasAdvancedFilters
                        ? "border-chrome/60 bg-white/[0.05] text-foreground"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    <SlidersHorizontal className="size-3.5" />
                    Filters
                    {hasAdvancedFilters ? " · ON" : ""}
                  </button>
                </div>
              </Reveal>

              {filtersOpen && (
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

          {error ? (
            <div className="glass-panel mt-12 rounded-[24px] p-8 text-center">
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                The object directory could not load. Try refreshing.
              </p>
            </div>
          ) : (
            <div className="mt-12">
              <ProductGrid
                products={visible}
                loading={isLoading}
                priorityCount={2}
                empty="No objects match these filters."
              />
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
