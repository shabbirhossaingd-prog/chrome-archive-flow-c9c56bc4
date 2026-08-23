import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Marquee } from "@/components/site/Marquee";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { HomepageBanner } from "@/components/site/HomepageBanner";
import { Toaster } from "@/components/ui/sonner";
import { useCategories, useProducts, formatPrice, prettyCategory } from "@/lib/products";
import { ProductGrid } from "@/components/site/ProductGrid";
import { CategoryCard } from "@/components/site/CategoryCard";
import { SmartImage } from "@/components/site/SmartImage";
import { useCurrentCollection } from "@/lib/cms";
import { useHomepageDeferredEnabled } from "@/lib/performance-hooks";
import campaign1 from "@/assets/campaign-1.webp";
import campaign2 from "@/assets/campaign-2.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ZZERKOFF" },
      {
        name: "description",
        content:
          "Shop the current ZZERKOFF collection: unisex chrome rings, chains, bracelets and alternative accessories.",
      },
      { property: "og:title", content: "ZZERKOFF — Objects for the Afterdark" },
      {
        property: "og:description",
        content: "Current ZZERKOFF objects. Unisex chrome accessories. Underground. Afterdark.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://zzerkoff.vercel.app/" },
      {
        rel: "preload",
        href: "/images/zzerkoff-logo.webp",
        as: "image",
        type: "image/webp",
        fetchPriority: "high",
      },
    ],
  }),
  component: Index,
});

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">{children}</span>
  );
}

function Index() {
  const catalogReady = useHomepageDeferredEnabled(true, 2200);

  const { data: products = [], isLoading } = useProducts(catalogReady);
  const { data: categories = [] } = useCategories(catalogReady);
  const { data: currentCollection } = useCurrentCollection(catalogReady);

  const currentProducts = currentCollection
    ? products.filter((p) => p.collection_id === currentCollection.id)
    : products.filter((p) => p.new_collection);

  const newDrop = currentProducts.length ? currentProducts : products.filter((p) => p.new_collection);
  const dropCode =
    currentCollection?.collection_code ||
    (currentCollection?.drop_number
      ? `DROP ${String(currentCollection.drop_number).padStart(3, "0")}`
      : "CURRENT DROP");
  const dropTagline = currentCollection?.tagline || "Objects selected for the afterdark.";
  const objectTypes =
    Array.from(new Set(newDrop.map((p) => p.category.replace(/-/g, " ").toUpperCase()))).join(" / ") ||
    "OBJECTS";

  const featured = products.find((p) => p.featured);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <Header />

      {/* HERO */}
      <section className="home-hero relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center">
        <LiquidChrome
          className="home-hero-chrome-primary left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2"
          opacity={0.3}
          blur={30}
        />
        <LiquidChrome className="home-hero-chrome-secondary -right-32 bottom-0 h-[30rem] w-[30rem]" opacity={0.12} flip />
        <div className="grain-overlay home-hero-grain" />

        <Reveal immediate>
          <img
            src="/images/zzerkoff-logo.webp"
            alt="ZZERKOFF liquid chrome ZZ monogram"
            width={720}
            height={720}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="home-hero-logo mx-auto w-[68vw] max-w-[34rem] animate-float-slow mix-blend-lighten contrast-125"
          />
        </Reveal>

        <Reveal delay={120} className="mt-2">
          <h1 className="chrome-text font-display text-3xl tracking-[0.3em] sm:text-5xl">
            Zzerkoff
          </h1>
          <p className="mt-6 font-editorial text-lg italic text-chrome/80 sm:text-2xl">
            Objects for the Afterdark.
          </p>
          <p className="mt-6 text-[9px] uppercase tracking-[0.5em] text-muted-foreground sm:text-[10px]">
            Unisex / Chrome / Vintage / Underground
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-12">
          <Link
            to="/collection"
            className="group inline-flex items-center gap-4 rounded-full border border-chrome/50 bg-white/[0.04] px-8 py-5 text-[10px] uppercase tracking-[0.45em] text-foreground backdrop-blur-md transition-all duration-700 hover:border-chrome hover:bg-white/[0.08]"
          >
            Enter {dropCode}
            <span className="transition-transform duration-700 group-hover:translate-x-1">→</span>
          </Link>
        </Reveal>
      </section>

      <HomepageBanner />
      <Marquee />

      {/* DROP 001 */}
      <section id="drop" className="perf-below-fold relative isolate scroll-mt-28 px-5 py-28 sm:px-8 sm:py-36">
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
              loading={!catalogReady || isLoading}
              empty="New objects arriving soon."
            />
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured ? (
        <section className="perf-below-fold relative isolate overflow-hidden px-5 py-24 sm:px-8">
          <LiquidChrome className="-right-40 top-0 h-[42rem] w-[42rem]" opacity={0.2} flip />
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal className="glass-panel relative overflow-hidden rounded-[28px]">
              <SmartImage
                src={featured.primary_image}
                alt={featured.name}
                width={1024}
                height={1280}
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

      {/* SHOP BY OBJECT */}
      <section className="perf-below-fold relative px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionLabel>SHOP BY OBJECT</SectionLabel>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* STATEMENT */}
      <section className="perf-below-fold relative isolate overflow-hidden px-5 py-36 sm:px-8 sm:py-48">
        <LiquidChrome
          className="left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2"
          opacity={0.16}
        />
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <h2 className="chrome-text font-display text-4xl leading-[1.1] tracking-[0.08em] sm:text-6xl lg:text-7xl">
              NOT MADE
              <br />
              TO BLEND IN.
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-12 max-w-xl font-editorial text-lg leading-relaxed text-muted-foreground sm:text-xl">
              ZZERKOFF explores metal, distortion, vintage forms and underground culture through
              unisex accessories.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ARCHIVE */}
      <section id="archive" className="perf-below-fold relative scroll-mt-28 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex items-end justify-between gap-6">
            <h2 className="font-display text-3xl tracking-[0.2em] text-foreground sm:text-5xl">
              THE ARCHIVE
            </h2>
            <SectionLabel>ZZ / VISUAL SERIES 001</SectionLabel>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:gap-6 lg:grid-cols-12">
            <Reveal className="lg:col-span-7">
              <figure className="glass-panel relative overflow-hidden rounded-[26px]">
                <img
                  src={campaign1}
                  alt="Hands wearing chrome rings, flash photography"
                  loading="lazy"
                  width={1200}
                  height={1504}
                  className="aspect-4/5 w-full object-cover grayscale"
                />
                <div className="grain-overlay" />
              </figure>
            </Reveal>

            <div className="flex flex-col gap-4 sm:gap-6 lg:col-span-5">
              <Reveal delay={140}>
                <figure className="glass-panel relative overflow-hidden rounded-[26px]">
                  <img
                    src={campaign2}
                    alt="Model in dark outfit with chrome chains"
                    loading="lazy"
                    width={1200}
                    height={912}
                    className="aspect-4/3 w-full object-cover grayscale"
                  />
                  <div className="grain-overlay" />
                </figure>
              </Reveal>
              <Reveal delay={260}>
                <figure className="glass-panel relative overflow-hidden rounded-[26px]">
                  <img
                    src={products[1]?.primary_image ?? campaign2}
                    alt="Chrome curb chain on black"
                    loading="lazy"
                    width={1024}
                    height={1280}
                    className="aspect-square w-full object-cover grayscale"
                  />
                  <div className="grain-overlay" />
                </figure>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="perf-below-fold relative isolate scroll-mt-28 px-5 py-32 sm:px-8">
        <LiquidChrome className="-left-32 bottom-0 h-[30rem] w-[30rem]" opacity={0.12} />
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="font-display text-2xl tracking-[0.2em] text-foreground sm:text-4xl">
              THIS IS ZZERKOFF.
            </h2>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-10 space-y-6 font-editorial text-lg leading-relaxed text-muted-foreground">
              <p>
                Zzerkoff is a unisex accessories label inspired by vintage metal, chrome, gothic
                fashion, Y2K and underground street culture.
              </p>
              <p>Created for people who prefer bold identities over ordinary trends.</p>
              <p className="text-chrome">For those who don't blend in.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
      <Toaster />
    </div>
  );
}
