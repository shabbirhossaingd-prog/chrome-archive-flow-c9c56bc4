import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/site/PageShell";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { SmartImage } from "@/components/site/SmartImage";
import { Reveal } from "@/components/site/Reveal";
import { ProductCard } from "@/components/site/ProductCard";
import { WishlistButton } from "@/components/site/WishlistButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  formatPrice,
  isSoldOut,
  productImages,
  useProducts,
  type Product,
} from "@/lib/products";
import { SITE, restockMessage } from "@/lib/site-config";
import { OrderModal } from "@/components/site/OrderModal";
import { addCartItem, productCartKey } from "@/lib/commerce";
import { useSite } from "@/lib/settings";
import { supabase } from "@/integrations/supabase/client";

const pretty = (slug: string) => slug.replace(/-/g, " ").toUpperCase();

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await (supabase as any)
      .from("products")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();

    if (error) {
      console.error("[product] could not load product", error);
      return null;
    }

    return data ?? null;
  },
  head: ({ params, loaderData }) => {
    const seoProduct = loaderData as any;
    const title =
      seoProduct?.seo_title?.trim() ||
      (seoProduct?.name
        ? `${seoProduct.name} — ZZERKOFF`
        : `${pretty(params.slug)} — ZZERKOFF`);
    const description =
      seoProduct?.seo_description?.trim() ||
      seoProduct?.short_description?.trim() ||
      seoProduct?.full_description?.trim() ||
      `${pretty(params.slug)} — a ZZERKOFF object for the afterdark.`;
    const canonical = `https://zzerkoff.vercel.app/product/${params.slug}`;
    const rawImage = seoProduct?.primary_image || "";
    const image = rawImage.startsWith("http")
      ? rawImage
      : rawImage.startsWith("/")
        ? `https://zzerkoff.vercel.app${rawImage}`
        : "https://zzerkoff.vercel.app/images/zzerkoff-logo.png";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const product = Route.useLoaderData() as Product | null;
  const { data: products = [] } = useProducts();

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-5 pt-32 sm:px-8 sm:pt-40">
        <Link
          to="/shop"
          className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground"
        >
          ← Back to shop
        </Link>

        {!product && (
          <p className="py-32 text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            This object is no longer available.
          </p>
        )}

        {product && <ProductDetail product={product} products={products} />}
      </div>
    </PageShell>
  );
}

function ProductDetail({
  product,
  products,
}: {
  product: Product;
  products: Product[];
}) {
  const site = useSite();
  const productAny = product as any;
  const images = productImages(product);
  const sizes = product.sizes ?? [];
  const finishes = product.finish ?? [];
  const colors = (productAny.colors ?? []) as string[];
  const colorStock = (productAny.color_stock ?? {}) as Record<string, number>;
  const preorder = product.stock_status === "PRE-ORDER";

  const firstAvailableColor =
    colors.find((value) => preorder || Number(colorStock[value] ?? 0) > 0) ??
    colors[0] ??
    "";

  const [size, setSize] = useState(sizes[0] ?? "");
  const [finish, setFinish] = useState(finishes[0] ?? "");
  const [color, setColor] = useState(firstAvailableColor);
  const [qty, setQty] = useState(1);
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    setSize(sizes[0] ?? "");
    setFinish(finishes[0] ?? "");
    setColor(firstAvailableColor);
    setQty(1);
  }, [product.id]);

  const aggregateSoldOut = isSoldOut(product);
  const colorAvailable =
    colors.length > 0 ? Number(colorStock[color] ?? 0) : Number(product.quantity_available ?? 0);
  const maxAvailable = Math.max(
    0,
    Math.min(Number(product.quantity_available ?? 0), colorAvailable),
  );
  const soldOut = aggregateSoldOut || (!preorder && colors.length > 0 && maxAvailable <= 0);

  useEffect(() => {
    if (preorder) {
      setQty((current) => Math.max(1, current));
      return;
    }

    setQty((current) =>
      maxAvailable > 0 ? Math.max(1, Math.min(current, maxAvailable)) : 1,
    );
  }, [maxAvailable, preorder]);

  const productUrl = `https://zzerkoff.vercel.app/product/${product.slug}`;
  const schemaImage =
    images[0] && !images[0].startsWith("storage:")
      ? images[0].startsWith("http")
        ? images[0]
        : `https://zzerkoff.vercel.app${images[0]}`
      : "https://zzerkoff.vercel.app/images/zzerkoff-logo.png";

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.product_code,
    description:
      productAny.seo_description ||
      product.short_description ||
      product.full_description,
    image: [schemaImage],
    url: productUrl,
    brand: { "@type": "Brand", name: "ZZERKOFF" },
    offers: {
      "@type": "Offer",
      priceCurrency: site.currencyCode,
      price: Number(product.price),
      availability: preorder
        ? "https://schema.org/PreOrder"
        : soldOut
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      url: productUrl,
    },
  };

  const delivery =
    product.delivery || site.settings?.default_delivery || SITE.delivery;
  const care = product.care || site.settings?.default_care || "";
  const sizeGuide =
    product.size_guide || site.settings?.default_size_guide || "";
  const details = product.details_content || product.full_description;
  const material = product.material_content || product.material;

  const sections = [
    { label: "DETAILS", body: details },
    { label: "SIZE GUIDE", body: sizeGuide },
    { label: "MATERIAL", body: material },
    { label: "CARE", body: care },
    { label: "DELIVERY", body: delivery },
  ].filter((section) => !!section.body);

  const related = useMemo(() => {
    const published = products.filter(
      (row) => row.id !== product.id && row.published,
    );
    const manual = (product.related_product_ids ?? [])
      .map((id) => published.find((row) => row.id === id))
      .filter((row): row is Product => !!row)
      .slice(0, 4);

    if (manual.length) return manual;

    const productTags = new Set(
      (product.tags ?? []).map((tag) => tag.toLowerCase()),
    );

    return published
      .map((row) => {
        let score = 0;
        if (row.category === product.category) score += 5;
        if (
          product.collection_id &&
          row.collection_id === product.collection_id
        ) {
          score += 3;
        }
        for (const tag of row.tags ?? []) {
          if (productTags.has(tag.toLowerCase())) score += 1;
        }
        if (!isSoldOut(row)) score += 1;
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((result) => result.row);
  }, [product, products]);

  const pill = (active: boolean, disabled = false) =>
    `rounded-xl border px-4 py-3 text-[9px] uppercase tracking-[0.3em] transition-colors ${
      disabled
        ? "cursor-not-allowed border-border/30 text-muted-foreground/35"
        : active
          ? "border-chrome/70 bg-white/[0.04] text-foreground"
          : "border-border/60 text-muted-foreground hover:text-foreground"
    }`;

  const addToCart = () => {
    if (soldOut) return;

    addCartItem({
      key: productCartKey(product.id, size, finish, color),
      kind: "product",
      id: product.id,
      slug: product.slug,
      name: product.name,
      code: product.product_code,
      image: product.primary_image,
      price: Number(product.price),
      quantity: qty,
      size,
      finish,
      color,
    });

    toast.success(preorder ? "Pre-order added to cart." : "Added to cart.");
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productSchema).replace(/</g, "\\u003c"),
        }}
      />

      <div className="relative mt-10 grid gap-12 pb-24 md:grid-cols-[58fr_42fr] md:gap-10 lg:gap-16">
        <LiquidChrome
          className="-left-40 top-20 h-[38rem] w-[38rem]"
          opacity={0.16}
        />

        <Reveal immediate className="space-y-4">
          <div className="glass-panel relative overflow-hidden rounded-[28px]">
            <SmartImage
              src={images[0]}
              alt={productAny.image_alt_text || product.name}
              width={1024}
              height={1280}
              eager
              className="aspect-4/5 w-full object-cover grayscale"
            />
            <div className="grain-overlay" />

            <WishlistButton
              productId={product.id}
              className="absolute right-5 top-5 z-20 bg-black/70"
            />

            {soldOut && (
              <span className="absolute left-5 top-5 rounded-full border border-chrome/50 bg-black/70 px-4 py-2 text-[9px] uppercase tracking-[0.35em] text-foreground backdrop-blur-md">
                Sold out
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {images.slice(1).map((src, index) => (
                <div
                  key={`${src}-${index}`}
                  className="glass-panel overflow-hidden rounded-[22px]"
                >
                  <SmartImage
                    src={src}
                    alt={`${productAny.image_alt_text || product.name} — view ${index + 2}`}
                    width={1024}
                    height={1024}
                    className="aspect-square w-full object-cover grayscale"
                  />
                </div>
              ))}
            </div>
          )}
        </Reveal>

        <Reveal immediate className="md:sticky md:top-28 md:self-start">
          <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
            {product.product_code}
          </span>

          <h1 className="mt-5 font-display text-2xl leading-tight tracking-[0.12em] text-foreground sm:text-3xl">
            {product.name}
          </h1>

          <p className="mt-4 text-sm tracking-[0.25em] text-chrome">
            {formatPrice(product.price, site.currencySymbol)}
            {product.old_price ? (
              <span className="ml-3 text-muted-foreground line-through">
                {formatPrice(product.old_price, site.currencySymbol)}
              </span>
            ) : null}
          </p>

          <div className="mt-8 space-y-2 border-y border-border/60 py-6">
            {(product.short_description || "")
              .split(/[.\n]/)
              .filter(Boolean)
              .map((line) => (
                <p
                  key={line}
                  className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground"
                >
                  {line.trim()}
                </p>
              ))}

            {product.fit_gender && (
              <p className="text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                {product.fit_gender}
              </p>
            )}

            <p className="pt-2 text-[10px] uppercase tracking-[0.35em] text-chrome">
              {soldOut ? "SOLD OUT" : preorder ? "PRE-ORDER" : product.stock_status}
            </p>
          </div>

          {colors.length > 0 && (
            <div className="mt-8">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                Color
              </span>
              <div className="flex flex-wrap gap-2">
                {colors.map((value) => {
                  const available = Number(colorStock[value] ?? 0);
                  const disabled = !preorder && available <= 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        setColor(value);
                        setQty(1);
                      }}
                      className={pill(color === value, disabled)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                Size
              </span>
              <div className="flex flex-wrap gap-2">
                {sizes.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSize(value)}
                    className={pill(size === value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              {product.size_description && (
                <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                  {product.size_description}
                </p>
              )}
            </div>
          )}

          {finishes.length > 0 && (
            <div className="mt-6">
              <span className="mb-3 block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
                Finish
              </span>
              <div className="flex flex-wrap gap-2">
                {finishes.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFinish(value)}
                    className={pill(finish === value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <span className="mb-3 block text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
              Quantity
            </span>
            <div className="flex items-center gap-6">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQty((value) => Math.max(1, value - 1))}
                className="grid size-10 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground"
              >
                −
              </button>
              <span className="text-xs tracking-[0.3em] text-foreground">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={soldOut || (!preorder && qty >= maxAvailable)}
                onClick={() =>
                  setQty((value) =>
                    preorder
                      ? value + 1
                      : maxAvailable > 0
                        ? Math.min(maxAvailable, value + 1)
                        : value,
                  )
                }
                className="grid size-10 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {soldOut ? (
              <>
                <div className="w-full rounded-full border border-border/60 px-8 py-5 text-center text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
                  Sold out
                </div>
                <a
                  href={site.wa(
                    restockMessage(product.name, product.product_code),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full rounded-full border border-chrome/40 px-8 py-5 text-center text-[10px] uppercase tracking-[0.4em] text-foreground transition-colors duration-500 hover:border-chrome hover:bg-white/[0.06]"
                >
                  Ask about restock →
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setOrderOpen(true)}
                  className="group flex w-full items-center justify-center gap-3 rounded-full border border-chrome/50 bg-white/[0.04] px-8 py-6 text-[10px] uppercase tracking-[0.45em] text-foreground transition-all duration-700 hover:border-chrome hover:bg-white/[0.08]"
                >
                  {preorder ? "Pre-order" : "Place order"}
                  <ArrowUpRight className="size-4 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={addToCart}
                  className="flex w-full items-center justify-center gap-3 rounded-full border border-border/60 px-8 py-5 text-[9px] uppercase tracking-[0.36em] text-muted-foreground transition-colors hover:border-chrome/50 hover:text-foreground"
                >
                  <ShoppingBag className="size-4" />
                  Add to cart
                </button>

                <WishlistButton productId={product.id} label className="w-full" />
              </>
            )}
          </div>

          {product.full_description && (
            <p className="mt-8 font-editorial text-lg leading-relaxed text-muted-foreground">
              {product.full_description}
            </p>
          )}

          <Accordion type="single" collapsible className="mt-8">
            {sections.map((section) => (
              <AccordionItem
                key={section.label}
                value={section.label}
                className="border-border/60"
              >
                <AccordionTrigger className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground hover:text-foreground hover:no-underline">
                  {section.label}
                </AccordionTrigger>
                <AccordionContent className="whitespace-pre-line text-xs leading-relaxed tracking-[0.1em] text-muted-foreground">
                  {section.body}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>

      <OrderModal
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        productId={product.id}
        productName={product.name}
        productCode={product.product_code}
        unitPrice={Number(product.price)}
        currencySymbol={site.currencySymbol}
        size={size}
        finish={finish}
        color={color}
        quantity={qty}
      />

      {related.length > 0 && (
        <section className="pb-32">
          <Reveal className="border-y border-border/50 py-5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
                RELATED OBJECTS
              </span>
              <Link
                to="/shop-the-look"
                className="text-[8px] uppercase tracking-[0.28em] text-chrome"
              >
                Shop the Look
              </Link>
            </div>
          </Reveal>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((row) => (
              <ProductCard key={row.id} product={row} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
