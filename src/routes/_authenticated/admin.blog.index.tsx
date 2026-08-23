import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPosts, formatDate } from "@/lib/cms";
import { SmartImage } from "@/components/site/SmartImage";
import { AdminButton } from "@/components/admin/AdminUI";
import { generateAiBlogDrafts } from "@/lib/growth.functions";

export const Route = createFileRoute("/_authenticated/admin/blog/")({
  component: AdminBlog,
});

function AdminBlog() {
  const { data: posts = [], isLoading } = useAdminPosts();
  const queryClient = useQueryClient();
  const generate = useServerFn(generateAiBlogDrafts);

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

  const generateDrafts = useMutation({
    mutationFn: async (count: number) => generate({ data: { count } }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      toast.success(`${result.created.length} AI blog draft${result.created.length === 1 ? "" : "s"} created.`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI generation failed"),
  });

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
            disabled={generateDrafts.isPending}
            onClick={() => generateDrafts.mutate(3)}
            className="inline-flex items-center gap-2 rounded-xl border border-chrome/60 bg-white/[0.05] px-5 py-3 text-[9px] uppercase tracking-[0.3em] text-foreground disabled:opacity-40"
          >
            <Sparkles className="size-3.5" />
            {generateDrafts.isPending ? "Generating..." : "Generate 3 AI drafts"}
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
        <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
          Gemini creates SEO-ready articles as DRAFTS only. Review facts, edit wording, add a featured image, then publish manually. Existing titles are used to reduce duplicate topics.
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
            Create manually or generate the first AI drafts.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="glass-panel flex flex-wrap items-center gap-4 rounded-[22px] p-4"
          >
            <SmartImage
              src={post.featured_image}
              alt={post.title}
              width={140}
              height={140}
              className="size-16 rounded-xl object-cover grayscale"
            />
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
        ))}
      </div>
    </div>
  );
}
