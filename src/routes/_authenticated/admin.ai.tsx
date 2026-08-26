import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowUpRight,
  Image,
  Layers3,
  Megaphone,
  MessageSquareText,
  Newspaper,
  PackagePlus,
  SearchCheck,
  ShoppingBag,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AdminButton, Field, adminField } from "@/components/admin/AdminUI";
import { generateAiBannerDraft, generateAiBlogWithImage } from "@/lib/ai-media.functions";

export const Route = createFileRoute("/_authenticated/admin/ai")({
  component: AdminAiStudio,
});

type BannerStyle = "chrome-frame" | "system-alert" | "editorial-dark";

const linkButton =
  "inline-flex items-center gap-2 rounded-xl border border-border/60 px-4 py-3 text-[8px] uppercase tracking-[0.28em] text-muted-foreground transition-colors hover:border-chrome/45 hover:text-foreground";

function AdminAiStudio() {
  const queryClient = useQueryClient();
  const generateBlog = useServerFn(generateAiBlogWithImage);
  const generateBanner = useServerFn(generateAiBannerDraft);
  const [bannerPrompt, setBannerPrompt] = useState("");
  const [bannerStyle, setBannerStyle] = useState<BannerStyle>("chrome-frame");
  const [bannerLink, setBannerLink] = useState("/shop");
  const [lastBanner, setLastBanner] = useState<{ internal_name: string; headline: string } | null>(null);

  const loadPreset = (prompt: string, style: BannerStyle, link = "/shop") => {
    setBannerPrompt(prompt);
    setBannerStyle(style);
    setBannerLink(link);
    toast.success("AI brief loaded. Review it, then generate.");
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

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

  const campaignMutation = useMutation({
    mutationFn: async () => {
      const prompt =
        bannerPrompt.trim() ||
        "Create a full ZZERKOFF launch campaign for chrome Y2K accessories. Dark editorial mood, underground fashion, no fake discount, drive customers to the current shop.";
      const [bannerResult, blogResult] = await Promise.all([
        generateBanner({
          data: {
            prompt,
            style: bannerStyle,
            button_href: bannerLink || "/shop",
          },
        }),
        generateBlog({ data: undefined }),
      ]);
      return { banner: bannerResult.created, blog: blogResult.created };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["homepage-banners"] });
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      setLastBanner(result.banner);
      toast.success("Campaign pack ready: banner draft + blog draft created.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "AI campaign pack failed"),
  });

  const busy = blogMutation.isPending || bannerMutation.isPending || campaignMutation.isPending;

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
              disabled={busy}
              onClick={() => blogMutation.mutate()}
            >
              {blogMutation.isPending ? "Generating blog + image…" : "Generate 1 AI blog"}
            </AdminButton>
            <Link to="/admin/blog" className={linkButton}>
              Open Blog <ArrowUpRight className="size-3" />
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

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    "Launch a new chrome accessories drop for ZZERKOFF. Dark Y2K editorial, underground styling, premium metal details, no fake discount, drive customers to shop the latest objects.",
                    "chrome-frame",
                    "/collection",
                  )
                }
                className="rounded-xl border border-border/60 px-3 py-3 text-[7px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
              >
                New Drop Brief
              </button>
              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    "Create a dramatic archive campaign for gothic chrome rings, chains and bracelets. Flash-photo mood, vintage black styling, collectible object energy, no text inside image.",
                    "editorial-dark",
                    "/archive",
                  )
                }
                className="rounded-xl border border-border/60 px-3 py-3 text-[7px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
              >
                Archive Brief
              </button>
              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    "Make a system-alert style ZZERKOFF campaign for limited preorder accessories. Futuristic Y2K chrome, dark interface mood, no letters or UI inside generated image, CTA to shop.",
                    "system-alert",
                    "/shop",
                  )
                }
                className="rounded-xl border border-border/60 px-3 py-3 text-[7px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
              >
                Preorder Brief
              </button>
            </div>

            <div className="rounded-2xl border border-chrome/20 bg-white/[0.02] p-4 text-[9px] leading-relaxed text-muted-foreground">
              Gemini generates the visual only. No text, logo, icon, badge, watermark or fake UI is requested inside the image. Headline, offer copy and CTA are generated separately and rendered by the website.
            </div>

            <div className="flex flex-wrap gap-3">
              <AdminButton
                tone="primary"
                disabled={busy || bannerPrompt.trim().length < 3}
                onClick={() => bannerMutation.mutate()}
              >
                <WandSparkles className="mr-2 size-3.5" />
                {bannerMutation.isPending ? "Generating banner…" : "Generate full AI banner"}
              </AdminButton>
              <AdminButton
                disabled={busy}
                onClick={() => campaignMutation.mutate()}
              >
                <Megaphone className="mr-2 size-3.5" />
                {campaignMutation.isPending ? "Generating pack…" : "Generate campaign pack"}
              </AdminButton>
            </div>

            {lastBanner && (
              <div className="rounded-2xl border border-chrome/30 p-4">
                <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">
                  DRAFT CREATED
                </span>
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-foreground">
                  {lastBanner.internal_name}
                </p>
                <p className="mt-2 text-[9px] text-muted-foreground">{lastBanner.headline}</p>
                <Link to="/admin/banners" className="mt-4 inline-block text-[8px] uppercase tracking-[0.3em] text-chrome">
                  Review in Banners →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="glass-panel rounded-[26px] p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
              AI PROJECT LAUNCHER
            </span>
            <h2 className="mt-3 font-display text-base tracking-[0.2em] text-foreground">
              WORKABLE PROJECTS
            </h2>
          </div>
          <span className="rounded-full border border-chrome/35 px-4 py-2 text-[7px] uppercase tracking-[0.28em] text-chrome">
            All buttons active
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/50 p-5">
            <PackagePlus className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">PRODUCT AI</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Photo upload → product name, category, price, tags, SEO and stock draft.
            </p>
            <Link to="/admin/products/bulk" className={`${linkButton} mt-4`}>
              Open Bulk AI <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/50 p-5">
            <Layers3 className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">COLLECTION AI</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Prepare collection launch copy, campaign brief and direction from one preset.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  loadPreset(
                    "Create a ZZERKOFF collection launch for the latest chrome accessories. Premium underground fashion, dark Y2K metal mood, no fake discount, CTA to new collection.",
                    "chrome-frame",
                    "/collection",
                  )
                }
                className={linkButton}
              >
                Load AI Brief
              </button>
              <Link to="/admin/collections" className={linkButton}>
                Collections <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 p-5">
            <ShoppingBag className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">MERCH AI</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Use AI-imported product data, then arrange homepage merchandising groups.
            </p>
            <Link to="/admin/merchandising" className={`${linkButton} mt-4`}>
              Open Merch <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/50 p-5">
            <SearchCheck className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">SEO / GROWTH</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Review traffic, indexing, SEO gaps, blog plan and growth actions in one area.
            </p>
            <Link to="/admin/growth" className={`${linkButton} mt-4`}>
              Open Growth <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border/50 p-5">
            <Newspaper className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">BLOG AI</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Generate one article with SEO meta and featured image, then edit/publish later.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <AdminButton disabled={busy} onClick={() => blogMutation.mutate()}>
                Generate
              </AdminButton>
              <Link to="/admin/blog" className={linkButton}>
                Blog List <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 p-5">
            <MessageSquareText className="size-5 text-chrome" />
            <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-foreground">SUPPORT AI</span>
            <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
              Open orders fast and use saved customer/order context for better manual replies.
            </p>
            <Link to="/admin/orders" className={`${linkButton} mt-4`}>
              Open Orders <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
