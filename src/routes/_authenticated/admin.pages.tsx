import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePages, type Page } from "@/lib/cms";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { AdminButton, Field, adminField } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  component: AdminPages,
});

type AboutJson = {
  statement?: string;
  tagline?: string;
  campaign_images?: string[];
  blocks?: Array<{ heading?: string; body?: string }>;
  show_intro?: boolean;
  show_statement?: boolean;
  show_campaign?: boolean;
  show_journal?: boolean;
};

type ShopJson = {
  show_directory?: boolean;
  show_filters?: boolean;
  show_categories?: boolean;
  show_products?: boolean;
  sort?: string;
  per_section?: number;
};

type Form = {
  id: string;
  page_key: string;
  label: string;
  title: string;
  subtitle: string;
  body: string;
  hero_image: string;
  seo_title: string;
  seo_description: string;
  statement: string;
  tagline: string;
  campaign_images: string[];
  show_directory: boolean;
  show_filters: boolean;
  show_categories: boolean;
  show_products: boolean;
  show_about_intro: boolean;
  show_about_statement: boolean;
  show_about_campaign: boolean;
  show_about_journal: boolean;
  per_section: string;
};

function fromPage(p: Page): Form {
  const json = (p.content_json ?? {}) as AboutJson & ShopJson;
  return {
    id: p.id,
    page_key: p.page_key,
    label: p.label,
    title: p.title,
    subtitle: p.subtitle,
    body: p.body,
    hero_image: p.hero_image,
    seo_title: p.seo_title,
    seo_description: p.seo_description,
    statement: json.statement ?? "",
    tagline: json.tagline ?? "",
    campaign_images: json.campaign_images ?? [],
    show_directory: json.show_directory ?? true,
    show_filters: json.show_filters ?? true,
    show_categories: json.show_categories ?? true,
    show_products: json.show_products ?? true,
    show_about_intro: json.show_intro ?? true,
    show_about_statement: json.show_statement ?? true,
    show_about_campaign: json.show_campaign ?? true,
    show_about_journal: json.show_journal ?? true,
    per_section: String(json.per_section ?? 15),
  };
}

type SectionVisibilityProps = {
  title: string;
  description: string;
  visible: boolean;
  onToggle: () => void;
};

function SectionVisibility({ title, description, visible, onToggle }: SectionVisibilityProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-border/55 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[9px] uppercase tracking-[0.24em] text-foreground">{title}</p>
          <span
            className={`rounded-full border px-2 py-1 text-[7px] uppercase tracking-[0.22em] ${
              visible
                ? "border-emerald-400/25 text-emerald-200/80"
                : "border-red-400/35 text-red-200/90"
            }`}
          >
            {visible ? "Visible" : "Hidden"}
          </span>
        </div>
        <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-muted-foreground">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 rounded-full border px-3 py-2 text-[7px] uppercase tracking-[0.24em] transition-colors ${
          visible
            ? "border-red-400/35 text-red-200/90 hover:bg-red-400/10"
            : "border-chrome/45 text-chrome hover:bg-white/[0.05]"
        }`}
      >
        {visible ? "Delete" : "Restore"}
      </button>
    </div>
  );
}

function AdminPages() {
  const { data: pages = [], isLoading } = usePages();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [dirty, setDirty] = useState(false);

  const currentPage = useMemo(
    () => pages.find((p) => p.id === form?.id) ?? null,
    [pages, form?.id],
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    if (!form) return;
    setDirty(true);
    setForm({ ...form, [key]: value });
  };

  const toggle = <K extends keyof Form>(key: K) => {
    if (!form || typeof form[key] !== "boolean") return;
    setDirty(true);
    setForm({ ...form, [key]: !form[key] } as Form);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form || !currentPage) throw new Error("Select a page");
      const existing = (currentPage.content_json ?? {}) as Record<string, unknown>;
      let content_json: Record<string, unknown> = { ...existing };

      if (form.page_key === "about") {
        content_json = {
          ...content_json,
          statement: form.statement,
          tagline: form.tagline,
          campaign_images: form.campaign_images,
          show_intro: form.show_about_intro,
          show_statement: form.show_about_statement,
          show_campaign: form.show_about_campaign,
          show_journal: form.show_about_journal,
        };
      }

      if (form.page_key === "shop") {
        content_json = {
          ...content_json,
          show_directory: form.show_directory,
          show_filters: form.show_filters,
          show_categories: form.show_categories,
          show_products: form.show_products,
          per_section: Math.max(1, Number(form.per_section || 15)),
        };
      }

      const { error } = await supabase
        .from("pages")
        .update({
          label: form.label,
          title: form.title,
          subtitle: form.subtitle,
          body: form.body,
          hero_image: form.hero_image,
          seo_title: form.seo_title,
          seo_description: form.seo_description,
          content_json: content_json as never,
        })
        .eq("id", form.id);

      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page updated successfully.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save page"),
  });

  return (
    <div className="space-y-8 pb-20">
      <div>
        <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          PUBLIC CONTENT / CMS
        </span>
        <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">PAGES</h1>
      </div>

      {isLoading && (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading pages…
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (dirty && !confirm("Discard unsaved page changes?")) return;
              setForm(fromPage(p));
              setDirty(false);
            }}
            className={`glass-panel rounded-[20px] p-5 text-left ${
              form?.id === p.id ? "border-chrome/70" : ""
            }`}
          >
            <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
              {p.page_key}
            </span>
            <p className="mt-3 font-display text-sm tracking-[0.18em] text-foreground">
              {p.title || p.page_key.toUpperCase()}
            </p>
            <span className="mt-4 block text-[8px] uppercase tracking-[0.3em] text-chrome">
              Edit →
            </span>
          </button>
        ))}
      </div>

      {form && (
        <div className="space-y-6">
          <div className="glass-panel space-y-6 rounded-[24px] p-6">
            <div>
              <span className="text-[8px] uppercase tracking-[0.4em] text-muted-foreground">
                EDITING
              </span>
              <h2 className="mt-2 font-display text-base tracking-[0.2em] text-foreground">
                {form.page_key.toUpperCase()}
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Small label">
                <input
                  className={adminField}
                  value={form.label}
                  onChange={(e) => set("label", e.target.value)}
                />
              </Field>
              <Field label="Main title">
                <input
                  className={adminField}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Subtitle / intro">
              <textarea
                className={adminField}
                rows={3}
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
              />
            </Field>

            <Field label="Body / brand story">
              <textarea
                className={adminField}
                rows={7}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
              />
            </Field>
          </div>

          {(form.page_key === "shop" || form.page_key === "about") && (
            <div className="glass-panel space-y-4 rounded-[24px] p-6">
              <div>
                <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
                  SECTION DELETE / VISIBILITY
                </h2>
                <p className="mt-2 text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
                  Delete means hide from website. Restore brings it back.
                </p>
              </div>

              {form.page_key === "shop" && (
                <div className="space-y-3">
                  <SectionVisibility
                    title="Directory cards"
                    description="Shop the Look / Bundle Sets card section"
                    visible={form.show_directory}
                    onToggle={() => toggle("show_directory")}
                  />
                  <SectionVisibility
                    title="All categories"
                    description="Horizontal category button row"
                    visible={form.show_categories}
                    onToggle={() => toggle("show_categories")}
                  />
                  <SectionVisibility
                    title="Filter drawer"
                    description="Search, availability, material and sort"
                    visible={form.show_filters}
                    onToggle={() => toggle("show_filters")}
                  />
                  <SectionVisibility
                    title="All products"
                    description="Product grid with left/right arrows"
                    visible={form.show_products}
                    onToggle={() => toggle("show_products")}
                  />
                </div>
              )}

              {form.page_key === "about" && (
                <div className="space-y-3">
                  <SectionVisibility
                    title="Intro story"
                    description="Subtitle and body text under About title"
                    visible={form.show_about_intro}
                    onToggle={() => toggle("show_about_intro")}
                  />
                  <SectionVisibility
                    title="Statement"
                    description="Not made to blend in / tagline block"
                    visible={form.show_about_statement}
                    onToggle={() => toggle("show_about_statement")}
                  />
                  <SectionVisibility
                    title="Campaign images"
                    description="About page image grid"
                    visible={form.show_about_campaign}
                    onToggle={() => toggle("show_about_campaign")}
                  />
                  <SectionVisibility
                    title="Journal"
                    description="Latest blog cards with arrows"
                    visible={form.show_about_journal}
                    onToggle={() => toggle("show_about_journal")}
                  />
                </div>
              )}
            </div>
          )}

          <div className="glass-panel space-y-6 rounded-[24px] p-6">
            <ImageUploader
              label="Hero / decorative image"
              max={1}
              value={form.hero_image ? [form.hero_image] : []}
              onChange={(v) => set("hero_image", v[0] ?? "")}
            />

            {form.page_key === "about" && (
              <>
                <Field label="Secondary statement">
                  <textarea
                    className={adminField}
                    rows={3}
                    value={form.statement}
                    onChange={(e) => set("statement", e.target.value)}
                    placeholder={"NOT MADE\nTO BLEND IN."}
                  />
                </Field>
                <Field label="Tagline">
                  <input
                    className={adminField}
                    value={form.tagline}
                    onChange={(e) => set("tagline", e.target.value)}
                  />
                </Field>
                <ImageUploader
                  label="Campaign images"
                  max={6}
                  value={form.campaign_images}
                  onChange={(v) => set("campaign_images", v)}
                />
              </>
            )}

            {form.page_key === "shop" && (
              <Field label="Products per page / arrow batch">
                <input
                  className={adminField}
                  type="number"
                  min={1}
                  max={100}
                  value={form.per_section}
                  onChange={(e) => set("per_section", e.target.value)}
                />
              </Field>
            )}
          </div>

          <div className="glass-panel space-y-5 rounded-[24px] p-6">
            <h2 className="font-display text-sm tracking-[0.22em] text-foreground">
              SEO & META
            </h2>
            <Field label="SEO title">
              <input
                className={adminField}
                value={form.seo_title}
                onChange={(e) => set("seo_title", e.target.value)}
              />
            </Field>
            <Field label="SEO description">
              <textarea
                className={adminField}
                rows={3}
                value={form.seo_description}
                onChange={(e) => set("seo_description", e.target.value)}
              />
            </Field>
          </div>

          <AdminButton tone="primary" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving changes…" : "Save page"}
          </AdminButton>
        </div>
      )}
    </div>
  );
}
