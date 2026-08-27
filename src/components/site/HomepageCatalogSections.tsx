import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { LiquidChrome } from "./LiquidChrome";
import { Reveal } from "./Reveal";
import { ProductGrid } from "./ProductGrid";
import { CategoryCard } from "./CategoryCard";
import { SmartImage } from "./SmartImage";
import { HomepageMerchandising } from "./HomepageMerchandising";
import { useCategories, useProducts, formatPrice, prettyCategory } from "@/lib/products";
import { useCurrentCollection } from "@/lib/cms";

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
      {children}
    </span>
  );
}

export function HomepageCatalogSections({ enabled }: { enabled: boolean }) {
  const { data: products = [], isLoading } = useProducts(enabled);
  const { data: categories = [] } = useCategories(enabled);
  const { data: currentCollection } = useCurrentCollection(enabled);

  const currentProducts = currentCollection
    ? products.filter((p) => p.collection_id === currentCollection.id)
    : products.filter((p) => p.new_collection);

  const newDrop = currentProducts.length
    ? currentProducts
    : products.filter((p) => p.new_collection);

  const dropCode =
    currentCollection?.collection_code ||
    (currentCollection?.drop_number
      ? `DROP ${String(currentCollection.drop_number).padStart(3, "0")}`
      : "CURRENT DROP");

  const dropTagline =
    currentCollection?.tagline || "Objects selected for the afterdark.";

  const objectTypes =
    Array.from(
      new Set(newDrop.map((p) => p.category.replace(/-/g, " ").toUpperCase())),
    ).join(" / ") || "OBJECTS";

  const featured = products.find((p) => p.featured);

  return (
    <>
      <section
        id="drop"
        className="perf-below-fold relative isolate scroll-mt-28 px-5 py-28 sm:px-8 sm:py-36"
      >
        <LiquidChrome className="-left-48 top-24 h-[34rem] w-[34rem]" opacity={0.14} />
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>ZZ / COLLECTION</SectionLabel>
              <h2 className="mt-5 font-display text-3xl tracking-[0.2em] text-foreground sm:text-5xl">
                {dropCode}
              </h2>
              <p className="mt-4 font-editorial text-lg italic text-muted-foreground">
                {dropTagline}
              </p>
            </div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              {objectTypes}
            </p>
          </Reveal>

          <div className="mt-14">
            <ProductGrid
              products={newDrop}
              loading={!enabled || isLoading}
              empty="New objects arriving soon."
            />
          </div>
        </div>
      </section>

      {featured ? (
        <section className="perf-below-fold relative isolate overflow-hidden px-5 py-24 sm:px-8">
          <LiquidChrome className="-right-40 top-0 h-[42rem] w-[42rem]" opacity={0.2} flip />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal className="glass-panel relative overflow-hidden rounded-[28px]">
              <SmartImage
                src={featured.primary_image}
                alt={featured.name}
                width={900}
                height={1125}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="aspect-4/5 w-full object-cover grayscale"
              />
              <div className="grain-overlay" />
            </Reveal>

            <Reveal delay={150}>
              <SectionLabel>{`SIGNATURE OBJECT / ${prettyCategory(featured.category)}`}</SectionLabel>
              <h2 className="mt-5 font-display text-2xl tracking-[0.18em] text-foreground sm:text-4xl">
                {featured.name}
              </h2>
              <p className="mt-5 text-sm tracking-[0.25em] text-chrome">
                {formatPrice(featured.price)}
              </p>
              <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {featured.short_description}
              </p>
              <Link
                to="/product/$slug"
                params={{ slug: featured.slug }}
                className="group mt-12 inline-flex items-center gap-4 rounded-full border border-chrome/50 bg-white/[0.04] px-8 py-5 text-[10px] uppercase tracking-[0.45em] text-foreground transition-all duration-700 hover:border-chrome hover:bg-white/[0.08]"
              >
                View object
                <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className="perf-below-fold relative px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionLabel>SHOP BY OBJECT</SectionLabel>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {categories.map((c, i) => (
              <Reveal key={c.slug} delay={i * 120}>
                <CategoryCard
                  category={c}
                  index={i}
                  count={products.filter((p) => p.category === c.slug).length}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <HomepageMerchandising products={products} enabled={enabled} />
    </>
  );
}
