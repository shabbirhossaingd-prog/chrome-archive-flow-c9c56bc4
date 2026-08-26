import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/site/PageShell";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { SmartImage } from "@/components/site/SmartImage";
import { usePage, pageJson, usePublishedPosts, formatDate } from "@/lib/cms";
import campaign1 from "@/assets/campaign-1.jpg";
import campaign2 from "@/assets/campaign-2.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "This is ZZERKOFF — About the label" },
      {
        name: "description",
        content:
          "ZZERKOFF is a unisex accessories label built on vintage metal, chrome, gothic fashion, Y2K and underground street culture.",
      },
      { property: "og:title", content: "This is ZZERKOFF — About the label" },
      {
        property: "og:description",
        content: "Not made to blend in. Objects for the afterdark, made in Dhaka.",
      },
    ],
  }),
  component: AboutPage,
});

type AboutJson = {
  statement?: string;
  tagline?: string;
  campaign_images?: string[];
};

function AboutPage() {
  const { page } = usePage("about");
  const { data: posts = [] } = usePublishedPosts();
  const json = pageJson<AboutJson>(page);

  const label = page?.label || "ZZ / LABEL";
  const title = page?.title || "THIS IS ZZERKOFF.";
  const intro = page?.subtitle || "An alternative accessories label from Dhaka.";
  const body =
    page?.body ||
    "Zzerkoff is a unisex accessories label inspired by vintage metal, chrome, gothic fashion, Y2K and underground street culture.";
  const statement = json.statement || "NOT MADE\nTO BLEND IN.";
  const tagline = json.tagline || "Objects for the Afterdark.";
  const campaignImages =
    json.campaign_images && json.campaign_images.length > 0
      ? json.campaign_images
      : [campaign1, campaign2, campaign1];

  return (
    <PageShell>
      <section className="relative isolate px-5 pt-40 sm:px-8 sm:pt-56">
        <LiquidChrome
          className="left-1/2 top-16 h-[30rem] w-[34rem] -translate-x-1/2"
          opacity={0.12}
          blur={40}
        />
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
              {label}
            </span>
            <h1 className="chrome-text mt-8 whitespace-pre-line font-display text-4xl leading-[1.05] tracking-[0.1em] sm:text-6xl">
              {title}
            </h1>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-16 max-w-2xl space-y-8 font-editorial text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {intro && <p>{intro}</p>}
              {body
                .split(/\n{2,}/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="relative isolate px-5 py-36 sm:px-8 sm:py-48">
        <LiquidChrome
          className="left-0 top-16 h-[26rem] w-[30rem]"
          opacity={0.09}
          blur={40}
          flip
        />
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="chrome-text whitespace-pre-line font-display text-4xl leading-[1.08] tracking-[0.06em] sm:text-6xl lg:text-7xl">
              {statement}
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="mt-14 font-editorial text-2xl italic text-chrome/80 sm:text-3xl">
              {tagline}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="px-5 pb-32 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 sm:gap-6 lg:grid-cols-3">
          {campaignImages.slice(0, 6).map((src, i) => (
            <Reveal key={`${src}-${i}`} delay={(i % 3) * 140}>
              <figure className="glass-panel relative overflow-hidden rounded-[26px]">
                <SmartImage
                  src={src}
                  alt="ZZERKOFF campaign imagery"
                  width={1200}
                  height={1500}
                  className="aspect-4/5 w-full object-cover grayscale brightness-90"
                />
                <div className="grain-overlay" />
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {posts.length > 0 && (
        <section className="px-5 pb-32 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
                ZZ / JOURNAL
              </span>
              <h2 className="mt-5 font-display text-2xl tracking-[0.18em] text-foreground sm:text-4xl">
                LATEST FROM ZZERKOFF
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.slice(0, 6).map((post, i) => (
                <Reveal
                  key={post.id}
                  delay={(i % 3) * 100}
                  className={i >= 3 ? "hidden md:block" : undefined}
                >
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="group glass-panel block h-full overflow-hidden rounded-[24px]"
                  >
                    <SmartImage
                      src={post.featured_image}
                      alt={post.title}
                      width={900}
                      height={1100}
                      className="aspect-4/3 w-full object-cover grayscale transition-transform duration-1000 group-hover:scale-[1.03]"
                    />
                    <div className="p-6">
                      <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                        {formatDate(post.published_at ?? post.created_at)}
                      </span>
                      <h3 className="mt-4 font-display text-base tracking-[0.13em] text-foreground">
                        {post.title}
                      </h3>
                      <p className="mt-4 font-editorial text-base leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                      <span className="mt-6 block text-[9px] uppercase tracking-[0.35em] text-chrome">
                        Read →
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            {posts.length > 3 && (
              <Reveal delay={220} className="mt-10 text-center">
                <Link
                  to="/blog"
                  className="group inline-flex items-center gap-3 rounded-full border border-chrome/45 bg-white/[0.03] px-7 py-4 text-[9px] uppercase tracking-[0.35em] text-foreground transition-colors hover:border-chrome hover:bg-white/[0.07]"
                >
                  All blog
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              </Reveal>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
