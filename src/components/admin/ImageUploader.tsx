import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage, toStorageRef } from "@/components/site/SmartImage";
import { adminLabel, AdminButton } from "./AdminUI";

const MAX_IMAGE_EDGE = 1800;
const WEBP_QUALITIES = [0.84, 0.78, 0.72] as const;
const TARGET_BYTES = 550 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function loadImage(file: File) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    return image;
  } catch {
    throw new Error("This image could not be decoded. Please use JPG, PNG, WebP or another browser-supported image format.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== "image/webp") {
          reject(new Error("Your browser could not convert this image to WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

async function optimizeForWeb(file: File) {
  const image = await loadImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("The selected image has invalid dimensions.");
  }

  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) throw new Error("Image optimization is not available in this browser.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  let bestBlob: Blob | null = null;
  for (const quality of WEBP_QUALITIES) {
    const blob = await canvasToWebp(canvas, quality);
    if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
    if (blob.size <= TARGET_BYTES || blob.size <= file.size * 0.65) {
      bestBlob = blob;
      break;
    }
  }

  if (!bestBlob) throw new Error("Image optimization failed.");

  if (file.type === "image/webp" && scale === 1 && file.size <= bestBlob.size) {
    return file;
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "zzerkoff-object";
  return new File([bestBlob], `${name}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function uploadOptimizedAdminImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Only image files are allowed");
  if (file.size > 12 * 1024 * 1024) throw new Error("Each image must be under 12MB");

  const optimized = await optimizeForWeb(file);
  const path = `${crypto.randomUUID()}.webp`;

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, optimized, {
      cacheControl: "31536000",
      upsert: false,
      contentType: "image/webp",
    });

  if (error) throw error;
  return {
    ref: toStorageRef(path),
    before: file.size,
    after: optimized.size,
  };
}

export function ImageUploader({
  label,
  value,
  onChange,
  max = 1,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = max - value.length;
    if (room <= 0) {
      toast.error(`Maximum ${max} image${max > 1 ? "s" : ""}`);
      return;
    }

    setBusy(true);
    try {
      const refs: string[] = [];
      let beforeBytes = 0;
      let afterBytes = 0;

      for (const file of Array.from(files).slice(0, room)) {
        const result = await uploadOptimizedAdminImage(file);
        refs.push(result.ref);
        beforeBytes += result.before;
        afterBytes += result.after;
      }

      onChange([...value, ...refs]);
      const saved = Math.max(0, beforeBytes - afterBytes);
      toast.success(
        saved > 0
          ? `WebP optimized · ${formatBytes(beforeBytes)} → ${formatBytes(afterBytes)} (saved ${formatBytes(saved)})`
          : `WebP optimized · ${formatBytes(afterBytes)}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeOne = async (ref: string, index: number) => {
    try {
      if (ref.startsWith("storage:")) {
        const path = ref.slice("storage:".length);
        const { error } = await supabase.storage.from("product-images").remove([path]);
        if (error) throw error;
      }
      onChange(value.filter((_, i) => i !== index));
      toast.success("Image removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove image");
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    const a = next[index]!;
    const b = next[target]!;
    next[index] = b;
    next[target] = a;
    onChange(next);
  };

  return (
    <div>
      <span className={adminLabel}>
        {label} ({value.length}/{max})
      </span>
      <p className="mb-3 text-[8px] uppercase tracking-[0.22em] text-muted-foreground">
        Auto optimized to WebP · max {MAX_IMAGE_EDGE}px · high quality
      </p>
      <div className="flex flex-wrap gap-3">
        {value.map((ref, index) => (
          <div key={`${ref}-${index}`} className="relative rounded-xl border border-border/60 p-1">
            <SmartImage
              src={ref}
              alt={`${label} ${index + 1}`}
              width={160}
              height={200}
              className="size-20 rounded-lg object-cover"
            />
            {max > 1 && (
              <div className="mt-1 flex justify-center gap-1">
                <button
                  type="button"
                  aria-label="Move image left"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="grid size-6 place-items-center rounded border border-border/50 text-muted-foreground disabled:opacity-30"
                >
                  <ArrowLeft className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Move image right"
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  className="grid size-6 place-items-center rounded border border-border/50 text-muted-foreground disabled:opacity-30"
                >
                  <ArrowRight className="size-3" />
                </button>
              </div>
            )}
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => void removeOne(ref, index)}
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full border border-border/70 bg-black text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        <AdminButton
          disabled={busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
          className="h-20"
        >
          {busy ? "Optimizing…" : "Add image"}
        </AdminButton>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
