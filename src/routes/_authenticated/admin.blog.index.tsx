import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ImageOff, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPosts, formatDate } from "@/lib/cms";
import { SmartImage } from "@/components/site/SmartImage";
import { AdminButton } from "@/components/admin/AdminUI";
import { generateAiBlogWithImage, retryAiBlogImage } from "@/lib/ai-media.functions";
import { buildBlogImageFallbackPrompt } from "@/lib/blog-image-prompt";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  component: AdminBlog,
});

function AdminBlog() {
  const { data: posts = [], isLoading } = useAdminPosts();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateAiBlogWithImage);
  const retryImage = useServerFn(retryAiBlogImage);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      toast.success("Blog post deleted");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  const generateDraft = useMutation({
    mutationFn: async () => generate({ data: undefined }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      if (result.imageGenerated) {
        toast.success(`AI blog + SEO + featured image created: ${result.created.title}`);
      } else {
        toast.info(`Blog + SEO created. Image failed, so a ready-to-copy prompt is shown below.`);
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI generation failed"),
  });

  const retryImageMutation = useMutation({
    mutationFn: async (postId: string) => retryImage({ data: { post_id: postId } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      toast.success(`Featured image generated for ${result.updated.title}`);
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? `${err.message} You can still copy the prompt and generate the image manually.`
          : "Image generation failed. Copy the prompt and try manually.",
      ),
  });

  const copyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success("Image prompt copied");
    } catch {
      toast.error("Could not copy automatically. Select the prompt text and copy it manually.");
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            ZZ / JOURNAL
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">BLOG</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generateDraft.isPending}
            onClick={() => generateDraft.mutate()}
            className="inline-flex items-center gap-2 rounded-xl border border-chrome/60 bg-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-[0.3em] text-foreground disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            {generateDraft.isPending ? "Generating blog + image..." : "Generate 1 AI blog"}
          </button>
          <Link
            to="/admin/blog/new"
            className="rounded-xl border border-chrome/60 bg-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-[0.35em] text-foreground"
          >
            + New post
          </Link>
        </div>
      </div>

      <div className="glass-panel rounded-[22px] p-5">
        <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">AI EDITORIAL</span>
        <p className="mt-3 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
          One click creates exactly one SEO-ready DRAFT and attempts one matching Gemini featured image. If the image fails, the blog still saves normally and a compact ZZERKOFF Y2K image prompt appears with COPY PROMPT + RETRY IMAGE controls.
        </p>
      </div>

      {isLoading && (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading posts…
        </p>
      )}

      {!isLoading && posts.length === 0 && (
        <div className="glass-panel rounded-[24px] p-8 text-center">
          <p className="font-display text-lg tracking-[0.2em] text-foreground">NO POSTS YET</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Create manually or generate one complete AI draft with its featured image.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => {
          const fallbackPrompt = buildBlogImageFallbackPrompt({
            title: post.title,
            excerpt: post.excerpt,
          });
          const imageMissing = !post.featured_image;
          const retryingThis =
            retryImageMutation.isPending && retryImageMutation.variables === post.id;

          return (
            <div key={post.id} className="glass-panel rounded-[22px] p-4">
              <div className="flex flex-wrap items-center gap-4">
                {post.featured_image ? (
                  <SmartImage
                    src={post.featured_image}
                    alt={post.title}
                    width={140}
                    height={140}
                    className="size-16 rounded-xl object-cover grayscale"
                  />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-xl border border-border/55 bg-black/35">
                    <ImageOff className="size-4 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-[14rem] flex-1">
                  <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">
                    {formatDate(post.published_at ?? post.created_at)}
                  </span>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-foreground">
                    {post.title}
                  </p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.3em] text-chrome">
                    {post.status}
                    {post.featured ? " · FEATURED" : ""}
                    {post.featured_image ? " · AI IMAGE" : " · IMAGE PENDING"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/admin/blog/$id"
                    params={{ id: post.id }}
                    className="rounded-xl border border-chrome/60 px-5 py-3 text-[9px] uppercase tracking-[0.35em] text-foreground"
                  >
                    Edit
                  </Link>
                  {post.status === "published" && (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-border/60 px-5 py-3 text-[9px] uppercase tracking-[0.35em] text-muted-foreground"
                    >
                      Preview
                    </a>
                  )}
                  <AdminButton
                    tone="danger"
                    onClick={() => {
                      if (confirm(`Delete blog post "${post.title}"?`)) remove.mutate(post.id);
                    }}
                  >
                    Delete
                  </AdminButton>
                </div>
              </div>

              {imageMissing && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-chrome/20 bg-black/35">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/45 px-4 py-3">
                    <span className="text-[7px] uppercase tracking-[0.34em] text-chrome">
                      ZZ / AI IMAGE PROMPT
                    </span>
                    <span className="text-[7px] uppercase tracking-[0.28em] text-muted-foreground">
                      IMAGE NOT GENERATED
                    </span>
                  </div>

                  <div className="p-4">
                    <p className="max-h-20 overflow-y-auto pr-2 text-[9px] leading-5 tracking-[0.04em] text-muted-foreground">
                      {fallbackPrompt}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => copyPrompt(fallbackPrompt)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-[7px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:border-chrome/50 hover:text-foreground"
                      >
                        <Copy className="size-3" />
                        Copy prompt
                      </button>
                      <button
                        type="button"
                        disabled={retryImageMutation.isPending}
                        onClick={() => retryImageMutation.mutate(post.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-chrome/45 bg-white/[0.03] px-3 py-2 text-[7px] uppercase tracking-[0.24em] text-foreground disabled:opacity-40"
                      >
                        <RefreshCw className={`size-3 ${retryingThis ? "animate-spin" : ""}`} />
                        {retryingThis ? "Retrying..." : "Retry image"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
