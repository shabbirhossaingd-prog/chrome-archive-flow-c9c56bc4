import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Marquee } from "@/components/site/Marquee";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { HomepageBanner } from "@/components/site/HomepageBanner";
import { useHomepageDeferredEnabled } from "@/lib/performance-hooks";
import chromeBlob from "@/assets/chrome-blob.webp";

const HomepageCatalogSections = lazy(() =>
  import("@/components/site/HomepageCatalogSections").then((module) => ({
    default: module.HomepageCatalogSections,
  })),
);
const HomepageArchive = lazy(() =>
  import("@/components/site/HomepageArchive").then((module) => ({
    default: module.HomepageArchive,
  })),
);
const Footer = lazy(() =>
  import("@/components/site/Footer").then((module) => ({ default: module.Footer })),
);

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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preload",
        href: "/images/zzerkoff-logo.webp",
        as: "image",
        type: "image/webp",
        fetchPriority: "high",
      },
      {
        rel: "preload",
        href: chromeBlob,
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
    <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
      {children}
    </span>
  );
}

function Index() {
  const catalogReady = useHomepageDeferredEnabled(true, 5200);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <Header />

      {/* HERO */}
      <section className="home-hero relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 text-center">
        <LiquidChrome
          className="home-hero-chrome-primary left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2"
          opacity={0.3}
          blur={30}
          defer={false}
          priority
        />
        <LiquidChrome className="home-hero-chrome-secondary -right-32 bottom-0 h-[30rem] w-[30rem]" opacity={0.12} flip />
        <div className="grain-overlay home-hero-grain" />

        <Reveal immediate>
          <img
            src="/images/zzerkoff-logo.webp"
            alt="ZZERKOFF liquid chrome ZZ monogram"
            width={512}
            height={512}
            sizes="(max-width: 640px) 66vw, 32rem"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="home-hero-logo mx-auto w-[68vw] max-w-[34rem] animate-float-slow mix-blend-lighten contrast-125 sm:w-[32rem] sm:max-w-[32rem]"
          />
        </Reveal>

        <Reveal delay={120} className="mt-2 sm:mt-1">
          <h1 className="chrome-text font-display text-3xl tracking-[0.3em] sm:text-2xl xl:text-3xl">
            Zzerkoff
          </h1>
          <p className="mt-6 font-editorial text-lg italic text-chrome/80 sm:mt-4 sm:text-xl xl:text-2xl">
            Objects for the Afterdark.
          </p>
          <p className="mt-6 text-[9px] uppercase tracking-[0.5em] text-muted-foreground sm:mt-4 sm:text-[10px]">
            Unisex / Chrome / Vintage / Underground
          </p>
        </Reveal>

        <Reveal delay={240} className="mt-12 sm:mt-8">
          <Link
            to="/collection"
            className="group inline-flex items-center gap-4 rounded-full border border-chrome/50 bg-black/45 px-8 py-5 text-[10px] uppercase tracking-[0.45em] text-foreground shadow-[0_0_28px_rgba(255,255,255,0.08)] backdrop-blur-md transition-all duration-700 hover:border-chrome hover:bg-white/[0.08] sm:px-7 sm:py-4 sm:text-[9px] xl:px-8 xl:py-5 xl:text-[10px]"
          >
            Enter Current Drop
            <span className="transition-transform duration-700 group-hover:translate-x-1">→</span>
          </Link>
        </Reveal>
      </section>

      <HomepageBanner />
      <Marquee />

      {catalogReady ? (
        <Suspense fallback={null}>
          <HomepageCatalogSections enabled={catalogReady} />
        </Suspense>
      ) : null}

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

      {catalogReady ? (
        <Suspense fallback={null}>
          <HomepageArchive />
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
        </Suspense>
      ) : null}
    </div>
  );
}
