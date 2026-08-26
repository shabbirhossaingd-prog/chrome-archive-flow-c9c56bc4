import { Link } from "@tanstack/react-router";
import { SmartImage } from "./SmartImage";
import type { Category } from "@/lib/products";

export function CategoryCard({
  category,
  index,
  count,
}: {
  category: Category;
  index: number;
  count?: number;
}) {
  return (
    <Link
      to="/shop/$category"
      params={{ category: category.slug }}
      className="group glass-panel relative block overflow-hidden rounded-[26px]"
    >
      <SmartImage
        src={category.image_url}
        alt={`${category.name} objects`}
        width={720}
        height={960}
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="aspect-3/4 w-full object-cover grayscale brightness-75 transition-all duration-[1800ms] ease-out group-hover:scale-105 group-hover:brightness-90"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
      <div className="grain-overlay" />
      <div className="absolute inset-x-0 bottom-0 p-6">
        <span className="text-[9px] tracking-[0.45em] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="mt-3 font-display text-lg tracking-[0.25em] text-foreground transition-transform duration-700 group-hover:translate-x-1">
          {category.name}
        </h3>
        {typeof count === "number" && (
          <span className="mt-2 block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            {count} {count === 1 ? "object" : "objects"}
          </span>
        )}
        <span className="mt-3 block text-[9px] uppercase tracking-[0.4em] text-chrome opacity-0 transition-opacity duration-700 group-hover:opacity-100">
          Explore →
        </span>
      </div>
    </Link>
  );
}
