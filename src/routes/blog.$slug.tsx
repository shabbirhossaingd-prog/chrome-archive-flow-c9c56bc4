import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { LiquidChrome } from "@/components/site/LiquidChrome";
import { Reveal } from "@/components/site/Reveal";
import { SmartImage } from "@/components/site/SmartImage";
import { postBySlugQuery, formatDate } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://zzerkoff.vercel.app";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data } = await (supabase as any)
      .from("blog_posts")
      .select(
        "title,slug,excerpt,seo_title,seo_description,featured_image,status,published_at,created_at",
      )
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    return data ?? null;
  },
  head: ({ params, loaderData }) => {
    const post = loaderData as any;
    const title =
      post?.seo_title?.trim() ||
      (post?.title ? `${post.title} — ZZERKOFF Journal` : "ZZERKOFF Journal");
    const description =
      post?.seo_description?.trim() ||
      post?.excerpt?.trim() ||
      "ZZERKOFF journal and editorial stories.";
    const canonical = `${SITE_URL}/blog/${params.slug}`;
    const rawImage = post?.featured_image || "";
    const image = rawImage.startsWith("http")
      ? rawImage
      : rawImage.startsWith("/")
        ? `${SITE_URL}${rawImage}`
        : `${SITE_URL}/images/zzerkoff-logo.png`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
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
  component: BlogDetail,
});

function BlogDetail() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery(postBySlugQuery(slug));

  if (isLoading) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl px-5 py-40 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading journal…
        </div>
      </PageShell>
    );
  }

  if (!post || post.status !== "published") {
    return (
      <PageShell>
        <section className="mx-auto max-w-4xl px-5 py-40">
          <h1 className="font-display text-2xl tracking-[0.2em] text-foreground">
            ENTRY NOT FOUND
          </h1>
          <Link
            to="/blog"
            className="mt-8 inline-block text-[9px] uppercase tracking-[0.35em] text-chrome"
          >
            Back to Journal
          </Link>
        </section>
      </PageShell>
    );
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt || "",
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    image: post.featured_image || `${SITE_URL}/images/zzerkoff-logo.png`,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "ZZERKOFF" },
    publisher: { "@type": "Organization", name: "ZZERKOFF" },
  };

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema).replace(/</g, "\\u003c"),
        }}
      />
      <article className="relative isolate overflow-hidden px-5 pb-32 pt-40 sm:px-8 sm:pt-52">
        <LiquidChrome
          className="left-1/2 top-16 h-[42rem] w-[42rem] -translate-x-1/2"
          opacity={0.14}
        />
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
              ZZ / JOURNAL · {formatDate(post.published_at ?? post.created_at)}
            </span>
            <h1 className="chrome-text mt-7 font-display text-3xl leading-[1.1] tracking-[0.08em] sm:text-5xl">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-8 max-w-2xl font-editorial text-xl italic leading-relaxed text-chrome/80">
                {post.excerpt}
              </p>
            )}
          </Reveal>

          {post.featured_image && (
            <Reveal delay={120} className="mt-14">
              <figure className="glass-panel overflow-hidden rounded-[28px]">
                <SmartImage
                  src={post.featured_image}
                  alt={post.title}
                  width={1400}
                  height={1000}
                  eager
                  className="aspect-4/3 w-full object-cover grayscale"
                />
              </figure>
            </Reveal>
          )}

          <Reveal delay={180}>
            <div
              className="mt-14 font-editorial text-lg leading-[1.9] text-muted-foreground [&_a]:text-chrome [&_blockquote]:my-8 [&_blockquote]:border-l [&_blockquote]:border-chrome/40 [&_blockquote]:pl-6 [&_h2]:mb-5 [&_h2]:mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:tracking-[0.08em] [&_hr]:my-10 [&_hr]:border-border/50 [&_li]:ml-6 [&_ol]:my-5 [&_ol]:list-decimal [&_p]:my-6 [&_strong]:text-foreground [&_ul]:my-5 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </Reveal>

          <Reveal delay={220}>
            <Link
              to="/blog"
              className="mt-16 inline-block text-[9px] uppercase tracking-[0.4em] text-chrome"
            >
              ← Back to Journal
            </Link>
          </Reveal>
        </div>
      </article>
    </PageShell>
  );
}
