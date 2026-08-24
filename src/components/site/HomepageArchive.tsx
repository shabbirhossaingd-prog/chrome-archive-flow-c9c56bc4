import { Reveal } from "./Reveal";
import { SmartImage } from "./SmartImage";
import { useHomepageArchiveVisual } from "@/lib/archive-visual";
import campaign1 from "@/assets/campaign-1.webp";
import campaign2 from "@/assets/campaign-2.webp";

type Slot = {
  src: string;
  alt: string;
  link: string;
};

function ArchiveImage({
  slot,
  className,
  width,
  height,
}: {
  slot: Slot;
  className: string;
  width: number;
  height: number;
}) {
  if (!slot.src) return null;

  const image = (
    <SmartImage
      src={slot.src}
      alt={slot.alt || "ZZERKOFF archive visual"}
      width={width}
      height={height}
      className={className}
    />
  );

  return (
    <figure className="glass-panel relative overflow-hidden rounded-[26px] bg-black">
      {slot.link ? (
        <a href={slot.link} aria-label={slot.alt || "Open archive visual"} className="block">
          {image}
        </a>
      ) : (
        image
      )}
      <div className="grain-overlay pointer-events-none" />
    </figure>
  );
}

export function HomepageArchive() {
  const { data: config } = useHomepageArchiveVisual();

  if (config && !config.active) return null;

  const title = config?.title?.trim() || "THE ARCHIVE";
  const seriesLabel = config?.series_label?.trim() || "ZZ / VISUAL SERIES 001";
  const isConfigured = !!config;

  const left: Slot = isConfigured
    ? {
        src: config.left_image || "",
        alt: config.left_alt || "",
        link: config.left_link || "",
      }
    : {
        src: campaign1,
        alt: "Hands wearing chrome rings, flash photography",
        link: "",
      };

  const topRight: Slot = isConfigured
    ? {
        src: config.top_right_image || "",
        alt: config.top_right_alt || "",
        link: config.top_right_link || "",
      }
    : {
        src: campaign2,
        alt: "Model in dark outfit with chrome chains",
        link: "",
      };

  const bottomRight: Slot = isConfigured
    ? {
        src: config.bottom_right_image || "",
        alt: config.bottom_right_alt || "",
        link: config.bottom_right_link || "",
      }
    : { src: "", alt: "", link: "" };

  const hasLeft = !!left.src;
  const hasTop = !!topRight.src;
  const hasBottom = !!bottomRight.src;
  const hasAnyImage = hasLeft || hasTop || hasBottom;

  if (!hasAnyImage && isConfigured) {
    return (
      <section id="archive" className="perf-below-fold relative scroll-mt-28 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal className="flex items-end justify-between gap-6">
            <h2 className="font-display text-3xl tracking-[0.2em] text-foreground sm:text-5xl">
              {title}
            </h2>
            <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
              {seriesLabel}
            </span>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section id="archive" className="perf-below-fold relative scroll-mt-28 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex items-end justify-between gap-6">
          <h2 className="font-display text-3xl tracking-[0.2em] text-foreground sm:text-5xl">
            {title}
          </h2>
          <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
            {seriesLabel}
          </span>
        </Reveal>

        <div className="mt-14 grid gap-4 sm:gap-6 lg:grid-cols-12">
          {hasLeft && (
            <Reveal className={hasTop || hasBottom ? "lg:col-span-7" : "lg:col-span-12"}>
              <ArchiveImage
                slot={left}
                width={1200}
                height={1504}
                className={`w-full object-cover grayscale ${
                  hasTop || hasBottom ? "aspect-4/5" : "aspect-[16/8]"
                }`}
              />
            </Reveal>
          )}

          {(hasTop || hasBottom) && (
            <div className={`flex flex-col gap-4 sm:gap-6 ${hasLeft ? "lg:col-span-5" : "lg:col-span-12 lg:grid lg:grid-cols-2"}`}>
              {hasTop && (
                <Reveal delay={140}>
                  <ArchiveImage
                    slot={topRight}
                    width={1200}
                    height={912}
                    className={`w-full object-cover grayscale ${hasBottom ? "aspect-4/3" : "aspect-square"}`}
                  />
                </Reveal>
              )}

              {hasBottom && (
                <Reveal delay={260}>
                  <ArchiveImage
                    slot={bottomRight}
                    width={1024}
                    height={1024}
                    className="aspect-square w-full object-cover grayscale"
                  />
                </Reveal>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
