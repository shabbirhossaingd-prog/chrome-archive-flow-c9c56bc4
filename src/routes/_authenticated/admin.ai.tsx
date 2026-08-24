import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Image, Sparkles, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { AdminButton, Field, adminField } from "@/components/admin/AdminUI";
import { generateAiBannerDraft, generateAiBlogWithImage } from "@/lib/ai-media.functions";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AdminAiStudio,
});

type BannerStyle = "chrome-frame" | "system-alert" | "editorial-dark";

function AdminAiStudio() {
  const queryClient = useQueryClient();
  const generateBlog = useServerFn(generateAiBlogWithImage);
  const generateBanner = useServerFn(generateAiBannerDraft);
  const [bannerPrompt, setBannerPrompt] = useState("");
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>("chrome-frame");
  const [bannerLink, setBannerLink] = useState("/shop");
  const [lastBanner, setLastBanner] = useState<{ internal_name: string; headline: string } | null>(null);

  const blogMutation = useMutation({
    mutationFn: async () => generateBlog({ data: undefined }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      toast.success(`Blog + SEO + image ready: ${result.created.title}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI blog generation failed"),
  });

  const bannerMutation = useMutation({
    mutationFn: async () =>
      generateBanner({
        data: {
          prompt: bannerPrompt,
          style: bannerStyle,
          button_href: bannerLink || "/shop",
        },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["homepage-banners"] });
      setLastBanner(result.created);
      toast.success("AI banner draft created. Review it in BANNERS before turning it on.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI banner generation failed"),
  });

  return (
    <div className="space-y-8 pb-24">
      <div>
        <span className="text-[9px] uppercase tracking-[0.42em] text-muted-foreground">
          ZZ / GENERATIVE CONTROL
        </span>
        <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">
          AI STUDIO
        </h1>
        <p className="mt-4 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
          One place for ZZERKOFF AI tools. Generated content stays editable and promotional assets are created as drafts first.
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[26px] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-chrome/35 bg-white/[0.03]">
              <Sparkles className="size-4 text-chrome" />
            </div>
            <div>
              <span className="text-[8px] uppercase tracking-[0.34em] text-muted-foreground">
                JOURNAL AUTOMATION
              </span>
              <h2 className="mt-3 font-display text-base tracking-[0.18em] text-foreground">
                1 BLOG + SEO + IMAGE
              </h2>
            </div>
          </div>

          <p className="mt-6 text-[10px] leading-relaxed text-muted-foreground">
            Generates exactly one useful non-duplicate article, SEO title/meta, and one matching 4:3 Gemini featured image. The image is forced toward clean editorial artwork with no logo, icon, typography, watermark, badge or UI overlay.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <AdminButton
              tone="primary"
              disabled={blogMutation.isPending}
              onClick={() => blogMutation.mutate()}
            >
              {blogMutation.isPending ? "Generating blog + image…" : "Generate 1 AI blog"}
            </AdminButton>
            <Link
              to="/admin/blog"
              className="rounded-xl border border-border/60 px-5 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Open Blog
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-[26px] p-6 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-chrome/35 bg-white/[0.03]">
              <Image className="size-4 text-chrome" />
            </div>
            <div>
              <span className="text-[8px] uppercase tracking-[0.34em] text-muted-foreground">
                PROMOTION GENERATOR
              </span>
              <h2 className="mt-3 font-display text-base tracking-[0.18em] text-foreground">
                AI BANNER
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Campaign prompt *">
              <textarea
                className={adminField}
                rows={5}
                value={bannerPrompt}
                onChange={(e) => setBannerPrompt(e.target.value)}
                placeholder="Example: New chrome rings drop. Dark flash photography, underground Y2K mood, limited collection. No discount."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Y2K website preset">
                <select
                  className={adminField}
                  value={bannerStyle}
                  onChange={(e) => setBannerStyle(e.target.value as BannerStyle)}
                >
                  <option value="chrome-frame">Chrome Frame</option>
                  <option value="system-alert">System Alert</option>
                  <option value="editorial-dark">Editorial Dark</option>
                </select>
              </Field>
              <Field label="CTA destination">
                <input
                  className={adminField}
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="/shop"
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-chrome/20 bg-white/[0.02] p-4 text-[9px] leading-relaxed text-muted-foreground">
              Gemini generates the visual only. No text, logo, icon, badge, watermark or fake UI is requested inside the image. Headline, offer copy and CTA are generated separately and rendered by the website.
            </div>

            <AdminButton
              tone="primary"
              disabled={bannerMutation.isPending || bannerPrompt.trim().length < 3}
              onClick={() => bannerMutation.mutate()}
            >
              <WandSparkles className="mr-2 size-3.5" />
              {bannerMutation.isPending ? "Generating banner…" : "Generate full AI banner"}
            </AdminButton>

            {lastBanner && (
              <div className="rounded-2xl border border-chrome/30 p-4">
                <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">
                  DRAFT CREATED
                </span>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-foreground">
                  {lastBanner.internal_name}
                </p>
                <p className="mt-2 text-[9px] text-muted-foreground">{lastBanner.headline}</p>
                <Link
                  to="/admin/banners"
                  className="mt-4 inline-block text-[8px] uppercase tracking-[0.3em] text-chrome"
                >
                  Review in Banners →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[26px] p-6 sm:p-7">
        <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
          NEXT / HIGH-VALUE AI MODULES
        </span>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["PRODUCT", "Photo → name, description, SEO, tags, material draft"],
            ["COLLECTION", "Prompt → collection copy + campaign image direction"],
            ["MERCH", "Suggest homepage product groups from current catalogue"],
            ["SEO AUDIT", "Find weak/missing SEO and generate fixes in bulk"],
            ["CAMPAIGN", "One brief → banner + blog + social copy + coupon messaging"],
            ["SUPPORT", "Draft order/reply messages without sending automatically"],
          ].map(([title, note]) => (
            <div key={title} className="rounded-2xl border border-border/50 p-4">
              <span className="text-[8px] uppercase tracking-[0.28em] text-foreground">{title}</span>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
