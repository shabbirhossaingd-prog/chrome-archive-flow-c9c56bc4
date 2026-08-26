import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ImagePlus, Sparkles, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAllCategories } from "@/lib/products";
import { detectBulkProductFromImage, createBulkProducts } from "@/lib/bulk-product.functions";
import { uploadOptimizedAdminImage } from "@/components/admin/ImageUploader";
import { SmartImage } from "@/components/site/SmartImage";
import { AdminButton, adminField } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin/products/bulk")({
  component: BulkProductImport,
});

type StockStatus = "IN STOCK" | "LOW STOCK" | "PRE-ORDER" | "SOLD OUT";
type AiStatus = "idle" | "working" | "done" | "error";

type BulkRow = {
  localId: string;
  fileName: string;
  image: string;
  selected: boolean;
  aiStatus: AiStatus;
  aiError: string;
  confidence: number;
  needsReview: boolean;
  productType: string;
  priceRange: string;
  name: string;
  slug: string;
  category: string;
  price: string;
  quantity: string;
  stockStatus: StockStatus;
  material: string;
  finish: string;
  shortDescription: string;
  fullDescription: string;
  tags: string[];
  detailsContent: string;
  materialContent: string;
  care: string;
  seoTitle: string;
  seoDescription: string;
  imageAltText: string;
};

const STOCKS: StockStatus[] = ["IN STOCK", "LOW STOCK", "PRE-ORDER", "SOLD OUT"];
const MAX_FILES = 60;

const PRICE_RULE_COPY = [
  "Ring ৳299–499",
  "Bracelet ৳599–899",
  "Wallet Chain ৳599–999",
  "Glasses ৳999–1599",
  "Chain / Necklace ৳399–699",
  "Headphone / Earphone ৳1299–2999",
  "Belt ৳1299–1799",
  "Earring ৳399–799",
  "Watch ৳15999–26999",
];

const makeRow = (fileName: string, image: string): BulkRow => ({
  localId: crypto.randomUUID(),
  fileName,
  image,
  selected: true,
  aiStatus: "idle",
  aiError: "",
  confidence: 0,
  needsReview: false,
  productType: "",
  priceRange: "",
  name: "",
  slug: "",
  category: "",
  price: "",
  quantity: "",
  stockStatus: "IN STOCK",
  material: "Unknown / not confirmed",
  finish: "",
  shortDescription: "",
  fullDescription: "",
  tags: [],
  detailsContent: "",
  materialContent: "",
  care: "",
  seoTitle: "",
  seoDescription: "",
  imageAltText: "",
});

function BulkProductImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { data: categories = [] } = useAllCategories();
  const detect = useServerFn(detectBulkProductFromImage);
  const create = useServerFn(createBulkProducts);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState({ current: 0, total: 0 });
  const [saveBusy, setSaveBusy] = useState(false);
  const [autoAi, setAutoAi] = useState(true);
  const [applyQty, setApplyQty] = useState("");

  const patchRow = (id: string, patch: Partial<BulkRow>) =>
    setRows((current) => current.map((row) => (row.localId === id ? { ...row, ...patch } : row)));

  const categoryPayload = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
  }));

  const analyze = async (targets: BulkRow[]) => {
    if (!targets.length) return;
    if (!categories.length) {
      toast.error("Create/activate categories before AI bulk detection.");
      return;
    }

    setAiBusy(true);
    setAiProgress({ current: 0, total: targets.length });

    let completed = 0;
    let failed = 0;
    for (const target of targets) {
      patchRow(target.localId, { aiStatus: "working", aiError: "" });
      try {
        const result = await detect({
          data: {
            image_ref: target.image,
            file_name: target.fileName,
            categories: categoryPayload,
          },
        });
        patchRow(target.localId, {
          aiStatus: "done",
          aiError: "",
          confidence: result.confidence,
          needsReview: result.needs_review,
          productType: result.product_type,
          priceRange: result.price_range,
          name: result.name,
          slug: result.slug,
          category: result.category,
          price: result.price > 0 ? String(result.price) : "",
          material: result.material,
          finish: result.finish,
          shortDescription: result.short_description,
          fullDescription: result.full_description,
          tags: result.tags,
          detailsContent: result.details_content,
          materialContent: result.material_content,
          care: result.care,
          seoTitle: result.seo_title,
          seoDescription: result.seo_description,
          imageAltText: result.image_alt_text,
        });
      } catch (error) {
        failed += 1;
        patchRow(target.localId, {
          aiStatus: "error",
          needsReview: true,
          aiError: error instanceof Error ? error.message : "AI detection failed",
        });
      } finally {
        completed += 1;
        setAiProgress({ current: completed, total: targets.length });
      }
    }

    setAiBusy(false);
    toast.success(
      failed
        ? `AI review finished · ${completed - failed} ready · ${failed} need manual review`
        : `${completed} products auto-filled by AI`,
    );
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    const room = MAX_FILES - rows.length;
    const selectedFiles = files.slice(0, Math.max(0, room));
    if (!selectedFiles.length) {
      toast.error(`Bulk importer supports up to ${MAX_FILES} images at a time.`);
      return;
    }

    setUploadBusy(true);
    setUploadProgress({ current: 0, total: selectedFiles.length });
    const added: BulkRow[] = [];

    try {
      let done = 0;
      for (const file of selectedFiles) {
        try {
          const result = await uploadOptimizedAdminImage(file);
          const row = makeRow(file.name, result.ref);
          added.push(row);
          setRows((current) => [...current, row]);
        } catch (error) {
          toast.error(`${file.name}: ${error instanceof Error ? error.message : "Upload failed"}`);
        } finally {
          done += 1;
          setUploadProgress({ current: done, total: selectedFiles.length });
        }
      }
    } finally {
      setUploadBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }

    if (added.length) {
      toast.success(`${added.length} images uploaded + optimized to WebP.`);
      if (autoAi) await analyze(added);
    }
  };

  const removeRow = async (row: BulkRow) => {
    if (row.image.startsWith("storage:")) {
      const path = row.image.slice("storage:".length);
      const { error } = await supabase.storage.from("product-images").remove([path]);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    setRows((current) => current.filter((item) => item.localId !== row.localId));
  };

  const setStock = (row: BulkRow, status: StockStatus) => {
    patchRow(row.localId, {
      stockStatus: status,
      quantity: status === "SOLD OUT" || status === "PRE-ORDER" ? "0" : row.quantity,
    });
  };

  const applyStatusToAll = (status: StockStatus) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        stockStatus: status,
        quantity: status === "SOLD OUT" || status === "PRE-ORDER" ? "0" : row.quantity,
      })),
    );
  };

  const applyQuantityToAll = () => {
    const qty = Math.max(0, Math.floor(Number(applyQty || 0)));
    setRows((current) =>
      current.map((row) =>
        row.stockStatus === "PRE-ORDER" || row.stockStatus === "SOLD OUT"
          ? row
          : { ...row, quantity: String(qty) },
      ),
    );
  };

  const saveSelected = async (publish: boolean) => {
    const selected = rows.filter((row) => row.selected);
    if (!selected.length) {
      toast.error("Select at least one product.");
      return;
    }

    for (const row of selected) {
      if (!row.name.trim()) {
        toast.error(`${row.fileName}: product name is required.`);
        return;
      }
      if (!row.category) {
        toast.error(`${row.name || row.fileName}: choose a category.`);
        return;
      }
      if (publish && Number(row.price || 0) <= 0) {
        toast.error(`${row.name}: enter/review the price before publishing.`);
        return;
      }
      if (
        publish &&
        row.stockStatus !== "PRE-ORDER" &&
        row.stockStatus !== "SOLD OUT" &&
        (row.quantity.trim() === "" || Number(row.quantity) <= 0)
      ) {
        toast.error(`${row.name}: enter exact admin stock quantity before publishing.`);
        return;
      }
      if (publish && !row.shortDescription.trim()) {
        toast.error(`${row.name}: run AI or add product copy before publishing.`);
        return;
      }
    }

    setSaveBusy(true);
    try {
      const result = await create({
        data: {
          publish,
          rows: selected.map((row) => ({
            name: row.name,
            slug: row.slug,
            category: row.category,
            price: Math.max(0, Number(row.price || 0)),
            quantity_available:
              row.stockStatus === "PRE-ORDER" || row.stockStatus === "SOLD OUT"
                ? 0
                : Math.max(0, Math.floor(Number(row.quantity || 0))),
            stock_status: row.stockStatus,
            primary_image: row.image,
            short_description: row.shortDescription,
            full_description: row.fullDescription,
            material: row.material,
            finish: row.finish,
            tags: row.tags,
            details_content: row.detailsContent,
            material_content: row.materialContent,
            care: row.care,
            seo_title: row.seoTitle,
            seo_description: row.seoDescription,
            image_alt_text: row.imageAltText,
          })),
        },
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (result.failed.length) {
        toast.error(`${result.created.length} created · ${result.failed.length} failed. Failed rows were kept for review.`);
        const failedNames = new Set(result.failed.map((item) => item.name));
        setRows((current) => current.filter((row) => !row.selected || failedNames.has(row.name)));
      } else {
        setRows((current) => current.filter((row) => !row.selected));
        toast.success(`${result.created.length} products ${publish ? "published" : "saved as drafts"}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk save failed");
    } finally {
      setSaveBusy(false);
    }
  };

  const selectedCount = rows.filter((row) => row.selected).length;
  const idleRows = rows.filter((row) => row.aiStatus === "idle" || row.aiStatus === "error");

  return (
    <div className="space-y-7 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">CATALOGUE / FAST INTAKE</span>
          <h1 className="mt-4 font-display text-xl tracking-[0.22em] text-foreground">BULK PRODUCT IMPORT</h1>
          <p className="mt-3 max-w-3xl text-[10px] leading-relaxed text-muted-foreground">
            Upload many product photos at once. Images are optimized to WebP, then Gemini detects product type, category, a unique ZZERKOFF-style name, copy, SEO and a varied price inside your fixed category range.
          </p>
        </div>
        <Link to="/admin/products" className="text-[9px] uppercase tracking-[0.3em] text-chrome">← Objects</Link>
      </div>

      <section className="glass-panel rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton
            tone="primary"
            disabled={uploadBusy || aiBusy || rows.length >= MAX_FILES}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="mr-2 size-4" />
            {uploadBusy
              ? `Uploading ${uploadProgress.current}/${uploadProgress.total}`
              : `Upload product photos (${rows.length}/${MAX_FILES})`}
          </AdminButton>
          <label className="inline-flex items-center gap-2 rounded-xl border border-border/50 px-4 py-3 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
            <input type="checkbox" checked={autoAi} onChange={(event) => setAutoAi(event.target.checked)} />
            AI auto-fill after upload
          </label>
          {rows.length > 0 && (
            <AdminButton disabled={aiBusy || uploadBusy || !idleRows.length} onClick={() => void analyze(idleRows)}>
              <Sparkles className="mr-2 size-3.5" />
              {aiBusy ? `AI ${aiProgress.current}/${aiProgress.total}` : `AI AUTO-FILL ${idleRows.length}`}
            </AdminButton>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {PRICE_RULE_COPY.map((rule) => (
            <span key={rule} className="rounded-lg border border-border/45 px-3 py-2 text-[7px] uppercase tracking-[0.18em] text-muted-foreground">
              {rule}
            </span>
          ))}
        </div>
      </section>

      {rows.length > 0 && (
        <section className="glass-panel rounded-[24px] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[8px] uppercase tracking-[0.28em] text-muted-foreground">APPLY STOCK TO ALL</span>
            {STOCKS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => applyStatusToAll(status)}
                className="rounded-lg border border-border/50 px-3 py-2 text-[7px] uppercase tracking-[0.2em] text-muted-foreground hover:border-chrome/50 hover:text-foreground"
              >
                {status}
              </button>
            ))}
            <div className="flex items-center gap-2">
              <input
                className={`${adminField} w-24`}
                type="number"
                min="0"
                value={applyQty}
                onChange={(event) => setApplyQty(event.target.value)}
                placeholder="QTY"
              />
              <AdminButton onClick={applyQuantityToAll}>Apply qty</AdminButton>
            </div>
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="glass-panel rounded-[28px] border-dashed p-12 text-center">
          <ImagePlus className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-5 font-display text-sm tracking-[0.2em] text-foreground">DROP PRODUCT PHOTOS HERE IN ONE GO</p>
          <p className="mx-auto mt-3 max-w-xl text-[9px] leading-relaxed text-muted-foreground">
            Each selected photo becomes one product row. Nothing is published until you review and press Publish Selected.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, index) => (
          <article key={row.localId} className="glass-panel rounded-[24px] p-4 sm:p-5">
            <div className="grid gap-5 lg:grid-cols-[110px_1fr]">
              <div>
                <div className="relative">
                  <SmartImage src={row.image} alt={row.imageAltText || row.fileName} width={220} height={280} className="aspect-4/5 w-full rounded-2xl object-cover grayscale" />
                  <span className="absolute left-2 top-2 rounded-lg border border-border/60 bg-black/80 px-2 py-1 text-[7px] tracking-[0.2em] text-foreground">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <label className="mt-3 flex items-center gap-2 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
                  <input type="checkbox" checked={row.selected} onChange={(event) => patchRow(row.localId, { selected: event.target.checked })} />
                  Selected
                </label>
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-lg border px-2.5 py-1.5 text-[7px] uppercase tracking-[0.2em] ${row.aiStatus === "done" ? "border-chrome/45 text-chrome" : row.aiStatus === "error" ? "border-red-500/40 text-red-300" : "border-border/50 text-muted-foreground"}`}>
                    {row.aiStatus === "working" ? "AI READING…" : row.aiStatus === "done" ? "AI READY" : row.aiStatus === "error" ? "AI FAILED" : "WAITING FOR AI"}
                  </span>
                  {row.needsReview && <span className="rounded-lg border border-amber-400/35 px-2.5 py-1.5 text-[7px] uppercase tracking-[0.2em] text-amber-200">NEEDS REVIEW</span>}
                  {row.productType && <span className="text-[7px] uppercase tracking-[0.22em] text-muted-foreground">{row.productType} · {Math.round(row.confidence * 100)}% · {row.priceRange}</span>}
                  <span className="truncate text-[7px] text-muted-foreground/70">{row.fileName}</span>
                  <button type="button" onClick={() => void removeRow(row)} className="ml-auto inline-flex items-center gap-1 text-[7px] uppercase tracking-[0.2em] text-red-300/70"><Trash2 className="size-3" /> Remove</button>
                </div>

                {row.aiError && <p className="rounded-xl border border-red-500/25 bg-red-500/[0.04] p-3 text-[8px] leading-relaxed text-red-200">{row.aiError} — edit manually or retry AI.</p>}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="xl:col-span-2">
                    <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">PRODUCT NAME</span>
                    <input className={adminField} value={row.name} onChange={(event) => patchRow(row.localId, { name: event.target.value })} placeholder="AI will name this object" />
                  </div>
                  <div>
                    <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">CATEGORY</span>
                    <select className={adminField} value={row.category} onChange={(event) => patchRow(row.localId, { category: event.target.value, needsReview: false })}>
                      <option value="">Choose category</option>
                      {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">PRICE (BDT)</span>
                    <input className={adminField} type="number" min="0" value={row.price} onChange={(event) => patchRow(row.localId, { price: event.target.value })} placeholder="AI suggestion" />
                  </div>
                </div>

                <div>
                  <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">STOCK STATUS + ADMIN QTY</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {STOCKS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setStock(row, status)}
                        className={`rounded-xl border px-3 py-2.5 text-[7px] uppercase tracking-[0.2em] ${row.stockStatus === status ? "border-chrome/60 bg-white/[0.05] text-foreground" : "border-border/50 text-muted-foreground"}`}
                      >
                        {status}
                      </button>
                    ))}
                    <input
                      className={`${adminField} w-28`}
                      type="number"
                      min="0"
                      disabled={row.stockStatus === "PRE-ORDER" || row.stockStatus === "SOLD OUT"}
                      value={row.quantity}
                      onChange={(event) => patchRow(row.localId, { quantity: event.target.value })}
                      placeholder="Exact qty"
                    />
                    <span className="text-[7px] leading-relaxed text-muted-foreground">PRE-ORDER stays PRE-ORDER even with 0 qty. Customers never see exact stock.</span>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">VISIBLE FINISH / COLOR</span>
                    <input className={adminField} value={row.finish} onChange={(event) => patchRow(row.localId, { finish: event.target.value })} placeholder="Chrome / black / silver…" />
                  </div>
                  <div>
                    <span className="mb-2 block text-[7px] uppercase tracking-[0.24em] text-muted-foreground">MATERIAL</span>
                    <input className={adminField} value={row.material} onChange={(event) => patchRow(row.localId, { material: event.target.value })} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <AdminButton disabled={aiBusy || row.aiStatus === "working"} onClick={() => void analyze([row])}>
                    <Sparkles className="mr-2 size-3" /> Retry / Generate AI
                  </AdminButton>
                  {row.aiStatus === "done" && <span className="inline-flex items-center gap-2 text-[7px] uppercase tracking-[0.22em] text-chrome"><Check className="size-3" /> Copy + SEO generated</span>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="sticky bottom-3 z-40 rounded-2xl border border-chrome/35 bg-black/90 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[8px] uppercase tracking-[0.24em] text-muted-foreground">{selectedCount} selected</span>
            <button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: true })))} className="text-[7px] uppercase tracking-[0.22em] text-chrome">Select all</button>
            <button type="button" onClick={() => setRows((current) => current.map((row) => ({ ...row, selected: false })))} className="text-[7px] uppercase tracking-[0.22em] text-muted-foreground">Clear</button>
            <div className="ml-auto flex flex-wrap gap-2">
              <AdminButton disabled={saveBusy || aiBusy || !selectedCount} onClick={() => void saveSelected(false)}>{saveBusy ? "Saving…" : "Save Selected Drafts"}</AdminButton>
              <AdminButton tone="primary" disabled={saveBusy || aiBusy || !selectedCount} onClick={() => void saveSelected(true)}>{saveBusy ? "Publishing…" : "Publish Selected"}</AdminButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
