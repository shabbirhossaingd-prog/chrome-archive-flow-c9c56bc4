import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@/components/site/Analytics";
import { GrowthLayer } from "@/components/site/GrowthLayer";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 text-center">
      <div className="grain-overlay" />
      <div className="relative z-10 max-w-lg">
        <img src="/images/zzerkoff-logo.png" alt="ZZERKOFF" width={220} height={220} className="mx-auto w-28 mix-blend-lighten contrast-125" />
        <span className="mt-8 block text-[9px] uppercase tracking-[0.48em] text-muted-foreground">ZZ / 404</span>
        <h1 className="chrome-text mt-5 font-display text-4xl tracking-[0.14em] sm:text-6xl">LOST OBJECT</h1>
        <p className="mx-auto mt-6 max-w-md font-editorial text-lg text-muted-foreground">
          This page has moved, disappeared, or returned to the archive.
        </p>
        <Link to="/" className="mt-9 inline-flex rounded-full border border-chrome/50 bg-white/[0.04] px-8 py-5 text-[9px] uppercase tracking-[0.38em] text-foreground transition-colors hover:bg-white/[0.08]">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 text-center">
      <div className="grain-overlay" />
      <div className="relative z-10 max-w-lg">
        <img src="/images/zzerkoff-logo.png" alt="ZZERKOFF" width={220} height={220} className="mx-auto w-28 mix-blend-lighten contrast-125" />
        <span className="mt-8 block text-[9px] uppercase tracking-[0.48em] text-muted-foreground">ZZ / SYSTEM</span>
        <h1 className="chrome-text mt-5 font-display text-3xl tracking-[0.14em] sm:text-5xl">SIGNAL INTERRUPTED</h1>
        <p className="mx-auto mt-6 max-w-md font-editorial text-lg text-muted-foreground">
          This page could not load correctly. Retry the signal or return to the archive entrance.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full border border-chrome/50 bg-white/[0.04] px-7 py-5 text-[9px] uppercase tracking-[0.34em] text-foreground transition-colors hover:bg-white/[0.08]"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border border-border/60 px-7 py-5 text-[9px] uppercase tracking-[0.34em] text-muted-foreground transition-colors hover:text-foreground">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ZZERKOFF" },
      {
        name: "description",
        content:
          "ZZERKOFF is a unisex alternative accessories label: chrome rings, chains and bracelets for the afterdark.",
      },
      { name: "author", content: "ZZERKOFF" },
      { property: "og:title", content: "ZZERKOFF — Objects for the Afterdark" },
      {
        property: "og:description",
        content: "Unisex chrome accessories. Vintage metal, gothic form, underground culture.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "ZZERKOFF" },
      { property: "og:image", content: "https://zzerkoff.vercel.app/images/zzerkoff-logo.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ZzerkOff" },
      { name: "twitter:description", content: "Unisex chrome accessories. Vintage metal, gothic form, underground culture." },
      { name: "twitter:image", content: "https://zzerkoff.vercel.app/images/zzerkoff-logo.png" },
      { name: "theme-color", content: "#050505" },
      { name: "robots", content: "index,follow,max-image-preview:large" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Space+Grotesk:wght@300;400;500;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Analytics />
      <Outlet />
      <GrowthLayer />
      <Toaster position="bottom-center" theme="dark" />
    </QueryClientProvider>
  );
}
