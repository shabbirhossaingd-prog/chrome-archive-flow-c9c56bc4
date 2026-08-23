import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SmartImage } from "./SmartImage";
import { useHomepageBanners, type HomepageBanner } from "@/lib/banners";
import { useHomepageDeferredEnabled } from "@/lib/performance-hooks";

const overlayClass: Record<HomepageBanner["overlay_strength"], string> = {
  none: "bg-transparent",
  light: "bg-black/20",
  medium: "bg-black/42",
  dark: "bg-black/62",
};

const alignClass: Record<HomepageBanner["text_position"], string> = {
  left: "items-start text-left",
  center: "items-center text-center",
  right: "items-end text-right",
};

function useCountdown(endAt: string | null, enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !endAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [enabled, endAt]);

  return useMemo(() => {
    if (!enabled || !endAt) return null;
    const remaining = Math.max(0, new Date(endAt).getTime() - now);
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds, ended: remaining <= 0 };
  }, [enabled, endAt, now]);
}

function trackBannerClick(banner: HomepageBanner, destination: string) {
  if (typeof window === "undefined") return;
  const w = window as any;
  w.gtag?.("event", "select_promotion", {
    promotion_id: banner.id,
    promotion_name: banner.internal_name || banner.headline,
    creative_name: banner.style,
    destination,
  });
  w.fbq?.("trackCustom", "BannerClick", {
    banner_id: banner.id,
    banner_name: banner.internal_name || banner.headline,
  });
}

function Countdown({ banner }: { banner: HomepageBanner }) {
  const countdown = useCountdown(banner.end_at, banner.show_countdown);
  if (!countdown || countdown.ended) return null;

  const unit = (value: number, label: string) => (
    <span className="min-w-10 text-center">
      <span className="block font-display text-sm tracking-[0.12em] text-foreground sm:text-base">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-1 block text-[6px] uppercase tracking-[0.28em] text-muted-foreground">
        {label}
      </span>
    </span>
  );

  return (
    <div className="mt-4 inline-flex items-center gap-1 rounded-xl border border-white/15 bg-black/45 px-3 py-2 backdrop-blur-sm">
      {unit(countdown.days, "D")}
      <span className="text-muted-foreground">:</span>
      {unit(countdown.hours, "H")}
      <span className="text-muted-foreground">:</span>
      {unit(countdown.minutes, "M")}
      <span className="text-muted-foreground">:</span>
      {unit(countdown.seconds, "S")}
    </div>
  );
}

function BannerVisual({ banner }: { banner: HomepageBanner }) {
  const destination = banner.full_link || banner.button_href || "/shop";
  const chrome = banner.style === "chrome-frame";
  const system = banner.style === "system-alert";

  return (
    <article
      className={`group relative isolate overflow-hidden bg-black ${
        chrome
          ? "rounded-[26px] border border-chrome/40 p-1.5 shadow-[0_0_40px_rgba(255,255,255,0.04)]"
          : system
            ? "rounded-[18px] border border-dashed border-chrome/45 p-1"
            : "rounded-[28px] border border-border/55"
      }`}
    >
      <div className="relative overflow-hidden rounded-[20px] bg-black">
        <SmartImage
          src={banner.image_url}
          alt={banner.headline || banner.internal_name || "ZZERKOFF promotion"}
          width={1600}
          height={800}
          className="block h-auto w-full object-contain"
        />

        {!banner.image_only && (
          <>
            <div className={`pointer-events-none absolute inset-0 ${overlayClass[banner.overlay_strength]}`} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <div
              className={`absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-8 lg:p-12 ${alignClass[banner.text_position]}`}
            >
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 text-[7px] uppercase tracking-[0.38em] text-white/60 sm:text-[8px]">
                  <span className="inline-block size-1.5 rounded-full bg-white/65" />
                  {system ? "SYSTEM//ZZERKOFF" : chrome ? "ZZ / TRANSMISSION" : "ZZ / EDITORIAL"}
                </span>

                {banner.headline && (
                  <h2 className="mt-2 font-display text-lg leading-[0.98] tracking-[0.1em] text-white drop-shadow-lg sm:mt-4 sm:text-4xl lg:text-6xl">
                    {banner.headline}
                  </h2>
                )}

                {banner.offer_text && (
                  <p className="mt-2 max-w-xl text-[8px] uppercase leading-relaxed tracking-[0.24em] text-white/70 sm:mt-4 sm:text-[10px] sm:tracking-[0.32em]">
                    {banner.offer_text}
                  </p>
                )}

                <Countdown banner={banner} />

                {banner.show_button && banner.button_label && (
                  <a
                    href={banner.button_href || destination}
                    onClick={() => trackBannerClick(banner, banner.button_href || destination)}
                    className="pointer-events-auto relative z-30 mt-4 inline-flex items-center gap-3 border border-white/35 bg-black/55 px-4 py-3 text-[7px] uppercase tracking-[0.32em] text-white backdrop-blur-sm transition-colors hover:border-white/70 hover:bg-black/75 sm:mt-6 sm:px-6 sm:py-4 sm:text-[9px]"
                  >
                    {banner.button_label}
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          </>
        )}

        {banner.full_link && (
          <a
            href={banner.full_link}
            aria-label={banner.headline || banner.internal_name || "Open promotion"}
            onClick={() => trackBannerClick(banner, banner.full_link)}
            className="absolute inset-0 z-10"
          />
        )}

        {chrome && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 z-30 h-5 w-5 border-l border-t border-white/55" />
            <span className="pointer-events-none absolute right-3 top-3 z-30 h-5 w-5 border-r border-t border-white/55" />
            <span className="pointer-events-none absolute bottom-3 left-3 z-30 h-5 w-5 border-b border-l border-white/55" />
            <span className="pointer-events-none absolute bottom-3 right-3 z-30 h-5 w-5 border-b border-r border-white/55" />
          </>
        )}

        {system && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-between border-b border-dashed border-white/20 bg-black/55 px-3 py-1.5 text-[6px] uppercase tracking-[0.28em] text-white/50">
            <span>TRANSMISSION ACTIVE</span>
            <span>ZZ//PROMO</span>
          </div>
        )}
      </div>
    </article>
  );
}

export function HomepageBanner() {
  const ready = useHomepageDeferredEnabled(true, 1400);
  const { data: banners = [] } = useHomepageBanners(ready);
  const banner = banners[0];

  if (!banner || !banner.image_url) return null;

  return (
    <section className="relative px-4 py-5 sm:px-8 sm:py-8" aria-label="Current promotion">
      <div className="mx-auto max-w-7xl">
        <BannerVisual banner={banner} />
      </div>
    </section>
  );
}
