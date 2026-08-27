import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const PREFIX = "storage:";
const SIGNED_IMAGE_TTL_SECONDS = 60 * 60 * 24 * 7;
const SIGNED_IMAGE_STALE_MS = 1000 * 60 * 60 * 24 * 6;
export const toStorageRef = (path: string) => `${PREFIX}${path}`;

type SmartImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  sizes?: string;
};

/**
 * Renders a product/content image. Accepts either a normal URL/path or a
 * "storage:<path>" reference for images uploaded through the admin dashboard.
 */
export function SmartImage({
  src,
  alt,
  className,
  width,
  height,
  eager,
  sizes,
}: SmartImageProps) {
  const isStorage = !!src && src.startsWith(PREFIX);
  const path = isStorage ? src!.slice(PREFIX.length) : null;

  const { data: signed } = useQuery({
    queryKey: ["storage-image", path],
    enabled: !!path,
    staleTime: SIGNED_IMAGE_STALE_MS,
    gcTime: SIGNED_IMAGE_STALE_MS + 1000 * 60 * 60,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("product-images")
        .createSignedUrl(path!, SIGNED_IMAGE_TTL_SECONDS);
      return data?.signedUrl ?? "";
    },
  });

  const url = isStorage ? signed : src;

  if (!url) {
    return <div className={cn("bg-white/[0.03]", className)} aria-hidden />;
  }

  return (
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "low"}
      decoding="async"
      className={className}
    />
  );
}
