import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { type Product } from "@/lib/products";
import { useHomepageMerch, type HomepageMerchSection } from "@/lib/merchandising";

function pickProducts(section: HomepageMerchSection, products: Product[]) {
  const limit = Math.max(1, Math.min(12, Number(section.limit_count || 4)));
  let rows: Product[] = [];

  if (section.section_type === "manual") {
    rows = (section.product_ids ?? [])
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is Product => !!product);
  } else if (section.section_type === "category") {
    rows = products.filter((product) => product.category === section.category_slug);
  } else if (section.section_type === "new") {
    rows = products.filter((product) => product.new_collection);
  } else if (section.section_type === "featured") {
    rows = products.filter((product) => product.featured);
  } else if (section.section_type === "sale") {
    rows = products.filter(
      (product) => Number(product.old_price ?? 0) > Number(product.price ?? 0),
    );
  }

  return rows.slice(0, limit);
}

export function HomepageMerchandising({
  products,
  enabled = true,
}: {
  products: Product[];
  enabled?: boolean;
}) {
  const { data: sections = [] } = useHomepageMerch(enabled);

  if (!enabled || !sections.length) return null;

  return (
    <div className="perf-below-fold">
      {sections.map((section) => {
        const rows = pickProducts(section, products);
        if (!rows.length) return null;

        return (
          <section key={section.id} className="relative px-5 py-20 sm:px-8 sm:py-28">
            <div className="mx-auto max-w-7xl">
              <Reveal className="flex flex-col gap-5 border-y border-border/50 py-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <span className="text-[9px] uppercase tracking-[0.44em] text-muted-foreground">
                    {section.eyebrow || "ZZ / CURATED"}
                  </span>
                  <h2 className="mt-4 font-display text-2xl tracking-[0.18em] text-foreground sm:text-4xl">
                    {section.title || section.internal_name}
                  </h2>
                  {section.subtitle && (
                    <p className="mt-4 max-w-2xl font-editorial text-base italic text-muted-foreground sm:text-lg">
                      {section.subtitle}
                    </p>
                  )}
                </div>

                {section.button_label && (
                  <Link
                    to={section.button_href || "/shop"}
                    className="inline-flex shrink-0 items-center gap-3 text-[9px] uppercase tracking-[0.32em] text-chrome transition-colors hover:text-foreground"
                  >
                    {section.button_label}
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                )}
              </Reveal>

              <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {rows.map((product, index) => (
                  <Reveal key={product.id} delay={index * 80}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
