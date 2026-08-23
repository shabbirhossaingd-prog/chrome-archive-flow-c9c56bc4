import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/site/PageShell";
import { Reveal } from "@/components/site/Reveal";
import { SmartImage } from "@/components/site/SmartImage";
import { publishedPostsQuery, formatDate } from "@/lib/cms";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "ZZERKOFF Journal" },
      {
        name: "description",
        content: "ZZERKOFF journal: styling, care, sizing and underground accessory culture.",
      },
    ],
    links: [{ rel: "canonical", href: "https://zzerkoff.vercel.app/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts = [], isLoading } = useQuery(publishedPostsQuery);

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-5 pb-32 pt-36 sm:px-8 sm:pt-44">
        <Reveal>
          <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
            ZZ / JOURNAL
          </span>
          <h1 className="chrome-text mt-5 font-display text-4xl tracking-[0.12em] sm:text-6xl">
            FIELD NOTES
          </h1>
          <p className="mt-6 max-w-2xl font-editorial text-xl text-muted-foreground">
            Styling, care, sizing, buying guides and afterdark culture.
          </p>
        </Reveal>

        {isLoading ? (
          <p className="mt-16 text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
            Loading journal…
          </p>
        ) : posts.length === 0 ? (
          <div className="glass-panel mt-16 rounded-[26px] p-8 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            No published entries yet.
          </div>
        ) : (
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={Math.min(index, 6) * 70}>
                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="glass-panel group block h-full overflow-hidden rounded-[26px]"
                >
                  {post.featured_image ? (
                    <SmartImage
                      src={post.featured_image}
                      alt={post.title}
                      width={900}
                      height={650}
                      className="aspect-[4/3] w-full object-cover grayscale transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="aspect-[4/3] w-full bg-white/[0.025]" />
                  )}
                  <div className="p-6">
                    <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                      {formatDate(post.published_at ?? post.created_at)}
                    </span>
                    <h2 className="mt-4 font-display text-lg leading-snug tracking-[0.08em] text-foreground">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
