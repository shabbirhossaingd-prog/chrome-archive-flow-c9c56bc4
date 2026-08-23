import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AdminButton, Field, Toggle, adminField } from "@/components/admin/AdminUI";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { HomepageBanner } from "@/lib/banners";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  component: AdminBanners,
});

type Draft = Omit<HomepageBanner, "id" | "created_at" | "updated_at"> & { id?: string };

const blankDraft = (): Draft => ({
  internal_name: "New Banner",
  image_url: "",
  headline: "",
  offer_text: "",
  button_label: "ENTER DROP",
  button_href: "/shop",
  full_link: "",
  style: "chrome-frame",
  text_position: "left",
  overlay_strength: "medium",
  image_only: false,
  show_button: true,
  show_countdown: false,
  active: false,
  start_at: null,
  end_at: null,
  sort_order: 0,
});

const fromBanner = (banner: HomepageBanner): Draft => ({ ...banner });

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function bannerStatus(banner: Pick<Draft, "active" | "start_at" | "end_at">) {
  if (!banner.active) return "DRAFT / OFF";
  const now = Date.now();
  if (banner.start_at && new Date(banner.start_at).getTime() > now) return "SCHEDULED";
  if (banner.end_at && new Date(banner.end_at).getTime() <= now) return "EXPIRED";
  return "LIVE";
}

function AdminBanners() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => blankDraft());
  const [editing, setEditing] = useState(false);

  const { data: banners = [], isLoading, error } = useQuery({
    queryKey: ["homepage-banners", "admin"],
    queryFn: async (): Promise<HomepageBanner[]> => {
      const { data, error } = await (supabase as any)
        .from("homepage_banners")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HomepageBanner[];
    },
    retry: false,
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const liveCount = useMemo(
    () => banners.filter((banner) => bannerStatus(banner) === "LIVE").length,
    [banners],
  );

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.internal_name.trim()) throw new Error("Banner name is required.");
      if (!draft.image_url) throw new Error("Upload a banner image first.");
      if (draft.start_at && draft.end_at && new Date(draft.end_at) <= new Date(draft.start_at)) {
        throw new Error("End time must be after start time.");
      }

      const payload = {
        internal_name: draft.internal_name.trim(),
        image_url: draft.image_url,
        headline: draft.headline.trim(),
        offer_text: draft.offer_text.trim(),
        button_label: draft.button_label.trim(),
        button_href: draft.button_href.trim() || "/shop",
        full_link: draft.full_link.trim(),
        style: draft.style,
        text_position: draft.text_position,
        overlay_strength: draft.overlay_strength,
        image_only: draft.image_only,
        show_button: draft.image_only ? false : draft.show_button,
        show_countdown: draft.image_only ? false : draft.show_countdown,
        active: draft.active,
        start_at: draft.start_at,
        end_at: draft.end_at,
        sort_order: Number(draft.sort_order || 0),
        updated_at: new Date().toISOString(),
      };

      if (draft.id) {
        const { error } = await (supabase as any)
          .from("homepage_banners")
          .update(payload)
          .eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("homepage_banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Banner saved.");
      queryClient.invalidateQueries({ queryKey: ["homepage-banners"] });
      setDraft(blankDraft());
      setEditing(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save banner."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!window.confirm("Delete this banner?")) return false;
      const { error } = await (supabase as any).from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
      return true;
    },
    onSuccess: (deleted) => {
      if (!deleted) return;
      toast.success("Banner deleted.");
      queryClient.invalidateQueries({ queryKey: ["homepage-banners"] });
      setEditing(false);
      setDraft(blankDraft());
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete banner."),
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">ZZ / PROMOTION SYSTEM</span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground sm:text-2xl">BANNERS</h1>
          <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
            Homepage offer / discount / drop banners. Use one 1600×800 image; storefront displays it at natural ratio with no crop on desktop and mobile.
          </p>
        </div>
        <AdminButton
          tone="primary"
          onClick={() => {
            setDraft(blankDraft());
            setEditing(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          + New banner
        </AdminButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="TOTAL" value={banners.length} />
        <Metric label="LIVE NOW" value={liveCount} />
        <Metric label="PRESETS" value={3} />
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.04] p-5 text-[10px] leading-relaxed text-amber-100/80">
          Banner database is not ready yet. Run migration <b>20260824000500_homepage_banners.sql</b> in Supabase SQL Editor, then refresh this page.
        </div>
      )}

      {!error && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-sm tracking-[0.2em] text-foreground">BANNER LIBRARY</h2>
              <p className="mt-2 text-[9px] text-muted-foreground">Click a card to edit. Lower sort number shows first when multiple banners are live.</p>
            </div>
          </div>

          {isLoading ? (
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Loading banners…</p>
          ) : banners.length === 0 ? (
            <div className="glass-panel rounded-[22px] p-6 text-xs text-muted-foreground">No banners yet.</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {banners.map((banner) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => {
                    setDraft(fromBanner(banner));
                    setEditing(true);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="glass-panel overflow-hidden rounded-[22px] text-left transition-colors hover:border-chrome/55"
                >
                  {banner.image_url ? (
                    <div className="aspect-[2/1] overflow-hidden bg-black">
                      <ImagePreview src={banner.image_url} alt={banner.internal_name} />
                    </div>
                  ) : null}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">{banner.style.replace(/-/g, " ")}</span>
                        <h3 className="mt-2 font-display text-sm tracking-[0.14em] text-foreground">{banner.internal_name}</h3>
                      </div>
                      <span className="rounded-lg border border-border/50 px-2 py-1 text-[7px] uppercase tracking-[0.18em] text-chrome">{bannerStatus(banner)}</span>
                    </div>
                    <p className="mt-3 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">SORT {banner.sort_order}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {editing && !error && (
        <section className="glass-panel rounded-[26px] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/50 pb-5">
            <div>
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">{draft.id ? "EDIT TRANSMISSION" : "NEW TRANSMISSION"}</span>
              <h2 className="mt-3 font-display text-lg tracking-[0.18em] text-foreground">{draft.internal_name || "UNTITLED BANNER"}</h2>
            </div>
            <span className="rounded-xl border border-chrome/35 px-3 py-2 text-[8px] uppercase tracking-[0.22em] text-chrome">{bannerStatus(draft)}</span>
          </div>

          <Accordion type="single" collapsible defaultValue="content" className="mt-2">
            <EditorSection value="content" title="01 / CONTENT">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Internal banner name *">
                  <input className={adminField} value={draft.internal_name} onChange={(e) => set("internal_name", e.target.value)} />
                </Field>
                <Field label="Headline">
                  <input className={adminField} value={draft.headline} onChange={(e) => set("headline", e.target.value)} placeholder="MIDNIGHT DROP" />
                </Field>
              </div>
              <Field label="Offer / subtext">
                <textarea className={adminField} rows={3} value={draft.offer_text} onChange={(e) => set("offer_text", e.target.value)} placeholder="UP TO 25% OFF / LIMITED OBJECTS" />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Button text">
                  <input className={adminField} value={draft.button_label} onChange={(e) => set("button_label", e.target.value)} />
                </Field>
                <Field label="Button link">
                  <input className={adminField} value={draft.button_href} onChange={(e) => set("button_href", e.target.value)} placeholder="/shop" />
                </Field>
              </div>
              <Field label="Full banner click link">
                <input className={adminField} value={draft.full_link} onChange={(e) => set("full_link", e.target.value)} placeholder="Optional — e.g. /collection" />
              </Field>
            </EditorSection>

            <EditorSection value="image" title="02 / IMAGE + NO-CROP">
              <div className="rounded-2xl border border-chrome/20 bg-white/[0.02] p-4 text-[9px] leading-relaxed text-muted-foreground">
                Recommended: <b className="text-foreground">1600 × 800 px (2:1)</b>. JPG / PNG / WebP are automatically optimized to WebP. The storefront uses natural ratio — no cover crop.
              </div>
              <ImageUploader
                label="Banner image"
                max={1}
                value={draft.image_url ? [draft.image_url] : []}
                onChange={(images) => set("image_url", images[0] ?? "")}
              />
              <Toggle label="Image-only mode (hide all website text/buttons)" checked={draft.image_only} onChange={(v) => set("image_only", v)} />
            </EditorSection>

            <EditorSection value="style" title="03 / Y2K VISUAL STYLE">
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ["chrome-frame", "CHROME FRAME", "Metal frame + corner markers"],
                  ["system-alert", "SYSTEM ALERT", "Terminal / transmission UI"],
                  ["editorial-dark", "EDITORIAL DARK", "Minimal campaign treatment"],
                ] as const).map(([value, label, note]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("style", value)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${draft.style === value ? "border-chrome/70 bg-white/[0.05]" : "border-border/50"}`}
                  >
                    <span className="text-[8px] uppercase tracking-[0.28em] text-foreground">{label}</span>
                    <span className="mt-2 block text-[8px] leading-relaxed text-muted-foreground">{note}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Text position">
                  <select className={adminField} value={draft.text_position} onChange={(e) => set("text_position", e.target.value as Draft["text_position"])}>
                    <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                  </select>
                </Field>
                <Field label="Image overlay">
                  <select className={adminField} value={draft.overlay_strength} onChange={(e) => set("overlay_strength", e.target.value as Draft["overlay_strength"])}>
                    <option value="none">None</option><option value="light">Light</option><option value="medium">Medium</option><option value="dark">Dark</option>
                  </select>
                </Field>
              </div>
              <Toggle label="Show CTA button" checked={draft.show_button} onChange={(v) => set("show_button", v)} />
            </EditorSection>

            <EditorSection value="schedule" title="04 / SCHEDULE + COUNTDOWN">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Start date / time">
                  <input type="datetime-local" className={adminField} value={toLocalDateTime(draft.start_at)} onChange={(e) => set("start_at", toIsoOrNull(e.target.value))} />
                </Field>
                <Field label="End date / time">
                  <input type="datetime-local" className={adminField} value={toLocalDateTime(draft.end_at)} onChange={(e) => set("end_at", toIsoOrNull(e.target.value))} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Sort / priority">
                  <input type="number" className={adminField} value={draft.sort_order} onChange={(e) => set("sort_order", Number(e.target.value || 0))} />
                </Field>
                <div className="flex items-end pb-1">
                  <Toggle label="Countdown to end time" checked={draft.show_countdown} onChange={(v) => set("show_countdown", v)} />
                </div>
              </div>
            </EditorSection>

            <EditorSection value="publish" title="05 / PUBLISH">
              <Toggle label={draft.active ? "Banner ON / eligible to show" : "Banner OFF / hidden"} checked={draft.active} onChange={(v) => set("active", v)} />
              <p className="text-[9px] leading-relaxed text-muted-foreground">
                ON banners still respect Start / End times. If multiple banners are live, the lowest Sort number is displayed first.
              </p>
            </EditorSection>
          </Accordion>

          <div className="mt-7 flex flex-wrap gap-3 border-t border-border/50 pt-6">
            <AdminButton tone="primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save banner"}
            </AdminButton>
            <AdminButton onClick={() => { setEditing(false); setDraft(blankDraft()); }}>Cancel</AdminButton>
            {draft.id && (
              <AdminButton tone="danger" disabled={remove.isPending} onClick={() => remove.mutate(draft.id!)}>
                Delete banner
              </AdminButton>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function EditorSection({ value, title, children }: { value: string; title: string; children: React.ReactNode }) {
  return (
    <AccordionItem value={value} className="border-border/50">
      <AccordionTrigger className="text-[9px] uppercase tracking-[0.34em] text-muted-foreground hover:text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pb-6 pt-2">{children}</AccordionContent>
    </AccordionItem>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-panel rounded-[18px] p-4">
      <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <p className="mt-2 font-display text-xl tracking-[0.12em] text-foreground">{value}</p>
    </div>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  // ImageUploader stores product-images references; this tiny preview reuses the same resolver.
  return <ImageUploaderPreview src={src} alt={alt} />;
}

function ImageUploaderPreview({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState(src.startsWith("storage:") ? "" : src);

  useMemo(() => {
    if (!src.startsWith("storage:")) {
      setUrl(src);
      return;
    }
    const path = src.slice("storage:".length);
    void supabase.storage.from("product-images").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? ""));
  }, [src]);

  return url ? <img src={url} alt={alt} className="h-full w-full object-cover" loading="lazy" /> : <div className="h-full w-full bg-white/[0.03]" />;
}
