import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCollections } from "@/lib/cms";
import { useHomepageArchiveVisual } from "@/lib/archive-visual";
import { AdminButton, Field, Toggle, adminField } from "@/components/admin/AdminUI";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { SmartImage } from "@/components/site/SmartImage";

export const Route = createFileRoute("/_authenticated/admin/archive")({
  component: AdminArchive,
});

type VisualDraft = {
  title: string;
  series_label: string;
  active: boolean;
  left_image: string;
  left_alt: string;
  left_link: string;
  top_right_image: string;
  top_right_alt: string;
  top_right_link: string;
  bottom_right_image: string;
  bottom_right_alt: string;
  bottom_right_link: string;
};

const EMPTY_VISUAL: VisualDraft = {
  title: "THE ARCHIVE",
  series_label: "ZZ / VISUAL SERIES 001",
  active: true,
  left_image: "",
  left_alt: "",
  left_link: "",
  top_right_image: "",
  top_right_alt: "",
  top_right_link: "",
  bottom_right_image: "",
  bottom_right_alt: "",
  bottom_right_link: "",
};

function AdminArchive() {
  const { data: collections = [], isLoading } = useAdminCollections();
  const { data: visual } = useHomepageArchiveVisual();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<VisualDraft>(EMPTY_VISUAL);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!visual || dirty) return;
    setDraft({
      title: visual.title || "THE ARCHIVE",
      series_label: visual.series_label || "ZZ / VISUAL SERIES 001",
      active: visual.active,
      left_image: visual.left_image || "",
      left_alt: visual.left_alt || "",
      left_link: visual.left_link || "",
      top_right_image: visual.top_right_image || "",
      top_right_alt: visual.top_right_alt || "",
      top_right_link: visual.top_right_link || "",
      bottom_right_image: visual.bottom_right_image || "",
      bottom_right_alt: visual.bottom_right_alt || "",
      bottom_right_link: visual.bottom_right_link || "",
    });
  }, [visual, dirty]);

  const set = <K extends keyof VisualDraft>(key: K, value: VisualDraft[K]) => {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveVisual = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("homepage_archive_visual")
        .upsert({ id: 1, ...draft }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["homepage-archive-visual"] });
      toast.success("Homepage archive visual saved.");
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Archive visual could not be saved. Run the archive migration first.",
      ),
  });

  const patch = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: { archived?: boolean; published?: boolean; is_current?: boolean };
    }) => {
      const { error } = await supabase.from("collections").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Archive updated successfully.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Archive update failed"),
  });

  const archived = collections.filter((c) => c.archived);
  const live = collections.filter((c) => !c.archived);

  return (
    <div className="space-y-8 pb-20">
      <div>
        <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          HOMEPAGE VISUAL + PAST DROPS / CMS
        </span>
        <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">ARCHIVE</h1>
      </div>

      <section className="glass-panel space-y-7 rounded-[24px] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border/50 pb-5">
          <div>
            <span className="text-[8px] uppercase tracking-[0.38em] text-muted-foreground">
              HOMEPAGE / VISUAL SERIES
            </span>
            <h2 className="mt-3 font-display text-base tracking-[0.2em] text-foreground">
              ARCHIVE VISUAL MANAGER
            </h2>
            <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
              Control the three-image Archive block on the homepage. Uploaded images are automatically optimized to WebP.
            </p>
          </div>
          <Toggle label="Show on homepage" checked={draft.active} onChange={(value) => set("active", value)} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Archive title">
            <input
              className={adminField}
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="THE ARCHIVE"
            />
          </Field>
          <Field label="Series label">
            <input
              className={adminField}
              value={draft.series_label}
              onChange={(e) => set("series_label", e.target.value)}
              placeholder="ZZ / VISUAL SERIES 001"
            />
          </Field>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-4 rounded-[20px] border border-border/50 p-4">
            <div>
              <span className="text-[8px] uppercase tracking-[0.34em] text-chrome">01 / LARGE LEFT</span>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Best with portrait or 4:5 editorial photography.</p>
            </div>
            <ImageUploader
              label="Large left image"
              max={1}
              value={draft.left_image ? [draft.left_image] : []}
              onChange={(next) => set("left_image", next[0] || "")}
            />
            <Field label="ALT text">
              <input className={adminField} value={draft.left_alt} onChange={(e) => set("left_alt", e.target.value)} />
            </Field>
            <Field label="Optional click link">
              <input className={adminField} value={draft.left_link} onChange={(e) => set("left_link", e.target.value)} placeholder="/product/slug or /collection" />
            </Field>
          </div>

          <div className="space-y-4 rounded-[20px] border border-border/50 p-4">
            <div>
              <span className="text-[8px] uppercase tracking-[0.34em] text-chrome">02 / TOP RIGHT</span>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Best with landscape or 4:3 campaign photography.</p>
            </div>
            <ImageUploader
              label="Top right image"
              max={1}
              value={draft.top_right_image ? [draft.top_right_image] : []}
              onChange={(next) => set("top_right_image", next[0] || "")}
            />
            <Field label="ALT text">
              <input className={adminField} value={draft.top_right_alt} onChange={(e) => set("top_right_alt", e.target.value)} />
            </Field>
            <Field label="Optional click link">
              <input className={adminField} value={draft.top_right_link} onChange={(e) => set("top_right_link", e.target.value)} placeholder="/shop or /product/slug" />
            </Field>
          </div>

          <div className="space-y-4 rounded-[20px] border border-border/50 p-4">
            <div>
              <span className="text-[8px] uppercase tracking-[0.34em] text-chrome">03 / BOTTOM RIGHT</span>
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">Square works best. Leave empty and the layout automatically closes the gap.</p>
            </div>
            <ImageUploader
              label="Bottom right image"
              max={1}
              value={draft.bottom_right_image ? [draft.bottom_right_image] : []}
              onChange={(next) => set("bottom_right_image", next[0] || "")}
            />
            <Field label="ALT text">
              <input className={adminField} value={draft.bottom_right_alt} onChange={(e) => set("bottom_right_alt", e.target.value)} />
            </Field>
            <Field label="Optional click link">
              <input className={adminField} value={draft.bottom_right_link} onChange={(e) => set("bottom_right_link", e.target.value)} placeholder="/shop/rings or /product/slug" />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 border-t border-border/50 pt-5">
          <AdminButton tone="primary" disabled={saveVisual.isPending} onClick={() => saveVisual.mutate()}>
            {saveVisual.isPending ? "Saving…" : "Save homepage archive"}
          </AdminButton>
          {dirty && (
            <span className="self-center text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
              Unsaved changes
            </span>
          )}
        </div>
      </section>

      {isLoading && (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading archive…
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          ARCHIVED COLLECTIONS
        </h2>
        {archived.length === 0 && (
          <div className="glass-panel rounded-[22px] p-6 text-xs text-muted-foreground">
            No archived collections yet.
          </div>
        )}
        {archived.map((c) => (
          <div key={c.id} className="glass-panel flex flex-wrap items-center gap-5 rounded-[22px] p-4">
            <SmartImage
              src={c.hero_image || c.campaign_images[0]}
              alt={c.name}
              className="size-20 rounded-xl object-cover grayscale"
              width={160}
              height={160}
            />
            <div className="min-w-[12rem] flex-1">
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                DROP {String(c.drop_number).padStart(3, "0")} · {c.year}
              </span>
              <h2 className="mt-2 font-display text-base tracking-[0.2em] text-foreground">
                {c.name}
              </h2>
              <p className="mt-2 text-[8px] uppercase tracking-[0.3em] text-chrome">
                {c.published ? "PUBLISHED" : "HIDDEN"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                onClick={() =>
                  patch.mutate({ id: c.id, values: { published: !c.published } })
                }
              >
                {c.published ? "Hide" : "Publish"}
              </AdminButton>
              <AdminButton
                onClick={() =>
                  patch.mutate({ id: c.id, values: { archived: false } })
                }
              >
                Restore
              </AdminButton>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
          ACTIVE / UNARCHIVED COLLECTIONS
        </h2>
        {live.map((c) => (
          <div key={c.id} className="glass-panel flex flex-wrap items-center gap-5 rounded-[22px] p-4">
            <div className="min-w-[12rem] flex-1">
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                DROP {String(c.drop_number).padStart(3, "0")} · {c.year}
              </span>
              <h2 className="mt-2 font-display text-base tracking-[0.2em] text-foreground">
                {c.name}
              </h2>
              <p className="mt-2 text-[8px] uppercase tracking-[0.3em] text-chrome">
                {c.is_current ? "CURRENT · " : ""}
                {c.published ? "PUBLISHED" : "DRAFT"}
              </p>
            </div>
            <AdminButton
              onClick={() => {
                if (c.is_current) {
                  toast.error("Choose another current collection before archiving this one.");
                  return;
                }
                patch.mutate({ id: c.id, values: { archived: true } });
              }}
            >
              Move to archive
            </AdminButton>
          </div>
        ))}
      </section>
    </div>
  );
}
