import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCollections, slugify, type Collection } from "@/lib/cms";
import { useAdminProducts } from "@/lib/products";
import { generateCollectionContent } from "@/lib/collection.functions";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { SmartImage } from "@/components/site/SmartImage";
import { AdminButton, Field, Toggle, adminField } from "@/components/admin/AdminUI";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Draft = {
  id?: string;
  collection_code: string;
  drop_number: string;
  name: string;
  slug: string;
  year: string;
  label: string;
  heading: string;
  tagline: string;
  description: string;
  hero_image: string;
  campaign_images: string[];
  editorial_images: string[];
  marquee_text: string;
  button_label: string;
  button_href: string;
  is_current: boolean;
  archived: boolean;
  published: boolean;
  sort_order: string;
};

const emptyDraft = (): Draft => ({
  collection_code: "",
  drop_number: "1",
  name: "",
  slug: "",
  year: String(new Date().getFullYear()),
  label: "",
  heading: "",
  tagline: "",
  description: "",
  hero_image: "",
  campaign_images: [],
  editorial_images: [],
  marquee_text: "",
  button_label: "ENTER THE SHOP",
  button_href: "/shop",
  is_current: false,
  archived: false,
  published: false,
  sort_order: "0",
});

function fromCollection(c: Collection): Draft {
  return {
    id: c.id,
    collection_code: c.collection_code,
    drop_number: String(c.drop_number),
    name: c.name,
    slug: c.slug,
    year: c.year,
    label: c.label,
    heading: c.heading,
    tagline: c.tagline,
    description: c.description,
    hero_image: c.hero_image,
    campaign_images: c.campaign_images,
    editorial_images: c.editorial_images,
    marquee_text: c.marquee_text,
    button_label: c.button_label,
    button_href: c.button_href,
    is_current: c.is_current,
    archived: c.archived,
    published: c.published,
    sort_order: String(c.sort_order),
  };
}

export function CollectionManager() {
  const { data: collections = [], isLoading } = useAdminCollections();
  const { data: products = [] } = useAdminProducts();
  const queryClient = useQueryClient();
  const generateCopy = useServerFn(generateCollectionContent);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      if (!product.collection_id) continue;
      map.set(product.collection_id, (map.get(product.collection_id) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const assignedProducts = products.filter((product) => assignedIds.includes(product.id));

  const generateAiCopy = async () => {
    if (!draft.name.trim()) {
      toast.error("Add the collection name first.");
      return;
    }

    setAiBusy(true);
    try {
      const result = await generateCopy({
        data: {
          name: draft.name.trim(),
          drop_number: Math.max(1, Number(draft.drop_number || 1)),
          year: draft.year,
          existing_tagline: draft.tagline,
          existing_description: draft.description,
          products: assignedProducts.slice(0, 24).map((product) => ({
            name: product.name,
            category: product.category,
          })),
        },
      });

      setDirty(true);
      setDraft((prev) => ({
        ...prev,
        label: result.label || prev.label,
        heading: result.heading || prev.heading,
        tagline: result.tagline || prev.tagline,
        description: result.description || prev.description,
        marquee_text: result.marquee_text || prev.marquee_text,
        button_label: result.button_label || prev.button_label,
      }));
      toast.success("Collection copy generated. Review before publishing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "AI generation failed");
    } finally {
      setAiBusy(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!draft.name.trim()) throw new Error("Collection name is required");
      const dropNumber = Math.max(1, Number(draft.drop_number || 1));
      const slug = draft.slug.trim() || slugify(`drop-${dropNumber}-${draft.name}`);
      const values = {
        collection_code:
          draft.collection_code.trim() || `DROP${String(dropNumber).padStart(3, "0")}`,
        drop_number: dropNumber,
        name: draft.name.trim().toUpperCase(),
        slug,
        year: draft.year,
        label: draft.label,
        heading: draft.heading || draft.name.trim().toUpperCase(),
        tagline: draft.tagline,
        description: draft.description,
        hero_image: draft.hero_image,
        campaign_images: draft.campaign_images,
        editorial_images: draft.editorial_images,
        marquee_text: draft.marquee_text,
        button_label: draft.button_label,
        button_href: draft.button_href,
        is_current: draft.is_current,
        archived: draft.archived,
        published: draft.published,
        sort_order: Number(draft.sort_order || 0),
      };

      if (draft.is_current) {
        const { error } = await supabase
          .from("collections")
          .update({ is_current: false })
          .neq("id", draft.id ?? "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }

      let collectionId = draft.id ?? "";
      if (draft.id) {
        const { error } = await supabase.from("collections").update(values).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("collections")
          .insert(values)
          .select("id")
          .single();
        if (error) throw error;
        collectionId = data.id;
      }

      const currentIds = products
        .filter((product) => product.collection_id === collectionId)
        .map((product) => product.id);
      const toRemove = currentIds.filter((id) => !assignedIds.includes(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from("products")
          .update({ collection_id: null, collection_name: "" })
          .in("id", toRemove);
        if (error) throw error;
      }

      if (assignedIds.length) {
        const collectionLabel = `DROP ${String(dropNumber).padStart(3, "0")} — ${draft.name.trim().toUpperCase()}`;
        const { error } = await supabase
          .from("products")
          .update({ collection_id: collectionId, collection_name: collectionLabel })
          .in("id", assignedIds);
        if (error) throw error;
      }

      return collectionId;
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Collection updated successfully.");
      setDraft(emptyDraft());
      setAssignedIds([]);
      setEditing(false);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save collection"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection deleted");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Delete failed"),
  });

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            DROPS / CAMPAIGNS
          </span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">
            COLLECTIONS
          </h1>
          <p className="mt-3 max-w-2xl text-[10px] leading-relaxed text-muted-foreground">
            Cleaner editor: one section opens at a time. Add imagery, generate collection copy with AI,
            assign objects and publish from the same screen.
          </p>
        </div>
        <AdminButton
          tone="primary"
          onClick={() => {
            setDraft(emptyDraft());
            setAssignedIds([]);
            setEditing(true);
            setDirty(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          + New collection
        </AdminButton>
      </div>

      {isLoading && (
        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          Loading collections…
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {collections.map((collection) => (
          <div key={collection.id} className="glass-panel overflow-hidden rounded-[22px]">
            {collection.hero_image ? (
              <SmartImage
                src={collection.hero_image}
                alt={`${collection.name} collection`}
                width={900}
                height={450}
                className="aspect-[16/7] w-full object-cover grayscale"
              />
            ) : null}
            <div className="p-5">
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                DROP {String(collection.drop_number).padStart(3, "0")} · {collection.year}
              </span>
              <h2 className="mt-3 font-display text-lg tracking-[0.2em] text-foreground">
                {collection.name}
              </h2>
              <p className="mt-2 text-[9px] uppercase tracking-[0.3em] text-chrome">
                {collection.is_current ? "CURRENT · " : ""}
                {collection.archived ? "ARCHIVED · " : ""}
                {collection.published ? "PUBLISHED" : "DRAFT"} · {counts.get(collection.id) ?? 0} OBJECTS
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <AdminButton
                  onClick={() => {
                    setDraft(fromCollection(collection));
                    setAssignedIds(
                      products
                        .filter((product) => product.collection_id === collection.id)
                        .map((product) => product.id),
                    );
                    setEditing(true);
                    setDirty(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </AdminButton>
                <AdminButton
                  tone="danger"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete collection "${collection.name}"? Products will not be deleted.`,
                      )
                    ) {
                      remove.mutate(collection.id);
                    }
                  }}
                >
                  Delete
                </AdminButton>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="glass-panel overflow-hidden rounded-[26px]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 p-6">
            <div>
              <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                COLLECTION EDITOR
              </span>
              <h2 className="mt-2 font-display text-base tracking-[0.2em] text-foreground">
                {draft.id ? draft.name || "EDIT COLLECTION" : "NEW COLLECTION"}
              </h2>
            </div>
            <span className="text-[8px] uppercase tracking-[0.28em] text-chrome">
              {assignedIds.length} OBJECT{assignedIds.length === 1 ? "" : "S"} SELECTED
            </span>
          </div>

          <Accordion type="single" collapsible defaultValue="basic" className="px-6">
            <AccordionItem value="basic" className="border-border/60">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.38em] text-muted-foreground hover:text-foreground hover:no-underline">
                01 / BASIC INFORMATION
              </AccordionTrigger>
              <AccordionContent className="pb-7 pt-2">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Drop number">
                    <input
                      className={adminField}
                      type="number"
                      min={1}
                      value={draft.drop_number}
                      onChange={(event) => set("drop_number", event.target.value)}
                    />
                  </Field>
                  <Field label="Collection code">
                    <input
                      className={adminField}
                      value={draft.collection_code}
                      onChange={(event) => set("collection_code", event.target.value)}
                      placeholder="DROP002"
                    />
                  </Field>
                  <Field label="Name">
                    <input
                      className={adminField}
                      value={draft.name}
                      onChange={(event) => {
                        const name = event.target.value;
                        setDirty(true);
                        setDraft((prev) => ({
                          ...prev,
                          name,
                          slug: prev.id
                            ? prev.slug
                            : slugify(`drop-${prev.drop_number}-${name}`),
                        }));
                      }}
                    />
                  </Field>
                  <Field label="Slug">
                    <input
                      className={adminField}
                      value={draft.slug}
                      onChange={(event) => set("slug", slugify(event.target.value))}
                    />
                  </Field>
                  <Field label="Year">
                    <input
                      className={adminField}
                      value={draft.year}
                      onChange={(event) => set("year", event.target.value)}
                    />
                  </Field>
                  <Field label="Sort order">
                    <input
                      className={adminField}
                      type="number"
                      value={draft.sort_order}
                      onChange={(event) => set("sort_order", event.target.value)}
                    />
                  </Field>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="copy" className="border-border/60">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.38em] text-muted-foreground hover:text-foreground hover:no-underline">
                02 / AI COPY + CONTENT
              </AccordionTrigger>
              <AccordionContent className="space-y-5 pb-7 pt-2">
                <div className="rounded-2xl border border-border/50 bg-white/[0.02] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <span className="text-[8px] uppercase tracking-[0.3em] text-chrome">
                        GEMINI COLLECTION WRITER
                      </span>
                      <p className="mt-2 max-w-xl text-[10px] leading-relaxed text-muted-foreground">
                        Uses the collection name and selected object names/categories. It will not invent product specifications.
                      </p>
                    </div>
                    <AdminButton disabled={aiBusy} onClick={() => void generateAiCopy()}>
                      <span className="inline-flex items-center gap-2">
                        <Sparkles className="size-3.5" />
                        {aiBusy ? "Generating…" : "Generate copy"}
                      </span>
                    </AdminButton>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Small label">
                    <input
                      className={adminField}
                      value={draft.label}
                      onChange={(event) => set("label", event.target.value)}
                    />
                  </Field>
                  <Field label="Heading">
                    <input
                      className={adminField}
                      value={draft.heading}
                      onChange={(event) => set("heading", event.target.value)}
                    />
                  </Field>
                  <Field label="Tagline">
                    <input
                      className={adminField}
                      value={draft.tagline}
                      onChange={(event) => set("tagline", event.target.value)}
                    />
                  </Field>
                  <Field label="Marquee text">
                    <input
                      className={adminField}
                      value={draft.marquee_text}
                      onChange={(event) => set("marquee_text", event.target.value)}
                    />
                  </Field>
                  <Field label="Button label">
                    <input
                      className={adminField}
                      value={draft.button_label}
                      onChange={(event) => set("button_label", event.target.value)}
                    />
                  </Field>
                  <Field label="Button destination">
                    <input
                      className={adminField}
                      value={draft.button_href}
                      onChange={(event) => set("button_href", event.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <textarea
                    className={adminField}
                    rows={7}
                    value={draft.description}
                    onChange={(event) => set("description", event.target.value)}
                  />
                </Field>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="images" className="border-border/60">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.38em] text-muted-foreground hover:text-foreground hover:no-underline">
                03 / IMAGES + MEDIA
              </AccordionTrigger>
              <AccordionContent className="space-y-8 pb-7 pt-2">
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Upload JPG, PNG or WebP. Images are automatically web-optimized before storage.
                </p>
                <ImageUploader
                  label="Hero image"
                  max={1}
                  value={draft.hero_image ? [draft.hero_image] : []}
                  onChange={(value) => set("hero_image", value[0] ?? "")}
                />
                <ImageUploader
                  label="Campaign images"
                  max={5}
                  value={draft.campaign_images}
                  onChange={(value) => set("campaign_images", value)}
                />
                <ImageUploader
                  label="Editorial images"
                  max={5}
                  value={draft.editorial_images}
                  onChange={(value) => set("editorial_images", value)}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="objects" className="border-border/60">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.38em] text-muted-foreground hover:text-foreground hover:no-underline">
                04 / COLLECTION OBJECTS
              </AccordionTrigger>
              <AccordionContent className="pb-7 pt-2">
                <p className="mb-5 text-[10px] leading-relaxed text-muted-foreground">
                  Select the objects that belong to this drop. Selected objects will automatically receive this collection assignment when saved.
                </p>
                {products.length === 0 ? (
                  <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                    No objects found
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {products.map((product) => {
                      const selected = assignedIds.includes(product.id);
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => {
                            setDirty(true);
                            setAssignedIds((prev) =>
                              prev.includes(product.id)
                                ? prev.filter((id) => id !== product.id)
                                : [...prev, product.id],
                            );
                          }}
                          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                            selected
                              ? "border-chrome/70 bg-white/[0.05]"
                              : "border-border/50 hover:border-border"
                          }`}
                        >
                          <span className="block text-[8px] uppercase tracking-[0.3em] text-muted-foreground">
                            {product.product_code}
                          </span>
                          <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-foreground">
                            {selected ? "✓ " : ""}
                            {product.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="publish" className="border-border/60">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.38em] text-muted-foreground hover:text-foreground hover:no-underline">
                05 / STATUS + PUBLISH
              </AccordionTrigger>
              <AccordionContent className="pb-7 pt-2">
                <div className="flex flex-wrap gap-3">
                  <Toggle
                    label="Current collection"
                    checked={draft.is_current}
                    onChange={(value) => set("is_current", value)}
                  />
                  <Toggle
                    label="Archived"
                    checked={draft.archived}
                    onChange={(value) => set("archived", value)}
                  />
                  <Toggle
                    label="Published"
                    checked={draft.published}
                    onChange={(value) => set("published", value)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex flex-wrap gap-3 border-t border-border/60 p-6">
            <AdminButton tone="primary" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save collection"}
            </AdminButton>
            <AdminButton
              onClick={() => {
                if (!dirty || confirm("Discard unsaved collection changes?")) {
                  setEditing(false);
                  setDirty(false);
                }
              }}
            >
              Cancel
            </AdminButton>
          </div>
        </div>
      )}
    </div>
  );
}
