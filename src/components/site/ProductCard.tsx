import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "./SmartImage";
import { WishlistButton } from "./WishlistButton";
import { customerStockLabel, formatPrice, productBadges, type Product } from "@/lib/products";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const badges = productBadges(product);
  const stockLabel = customerStockLabel(product);

  return (
    <article className="group glass-panel relative overflow-hidden rounded-[24px] transition-all duration-700 hover:border-chrome/60">
      <WishlistButton
        productId={product.id}
        className="absolute right-3 top-3 z-20 bg-black/70"
      />

      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        aria-label={`View ${product.name}, ${formatPrice(product.price)}, ${stockLabel}`}
        className="block focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome"
      >
        <div className="relative overflow-hidden bg-black">
          <SmartImage
            src={product.primary_image}
            alt={product.name}
            width={720}
            height={900}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            eager={priority}
            className="aspect-4/5 w-full object-cover grayscale transition-transform duration-[1600ms] ease-out group-hover:scale-105"
          />
          <div className="grain-overlay" />

          {badges.length > 0 && (
            <div className="absolute left-4 top-4 z-10 flex max-w-[70%] flex-wrap gap-2" aria-label="Product badges">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className={`rounded-full border bg-black/75 px-3 py-2 text-[8px] uppercase tracking-[0.3em] backdrop-blur-md ${
                    badge === "SOLD OUT" || badge === "PRE-ORDER"
                      ? "border-chrome/55 text-foreground"
                      : "border-border/60 text-muted-foreground"
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-4 p-4 sm:p-5">
          <div className="min-w-0">
            <span className="block text-[9px] tracking-[0.4em] text-muted-foreground">
              {product.product_code}
            </span>
            <h3 className="mt-2 truncate text-[11px] uppercase tracking-[0.28em] text-foreground transition-transform duration-700 group-hover:translate-x-1">
              {product.name}
            </h3>
            <p className="mt-2 text-[11px] tracking-[0.2em] text-chrome">
              {formatPrice(product.price)}
              {product.old_price ? (
                <span className="ml-2 text-muted-foreground line-through">
                  {formatPrice(product.old_price)}
                </span>
              ) : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                {product.category.replace(/-/g, " ")}
              </span>
              <span className="text-[8px] uppercase tracking-[0.3em] text-chrome/80">
                {stockLabel}
              </span>
            </div>
          </div>

          <ArrowUpRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground transition-all duration-700 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-foreground" />
        </div>
      </Link>
    </article>
  );
}
