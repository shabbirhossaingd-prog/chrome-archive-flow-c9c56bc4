import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-atmosphere relative min-h-screen overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[120] focus:rounded-full focus:border focus:border-chrome/60 focus:bg-black focus:px-5 focus:py-3 focus:text-[9px] focus:uppercase focus:tracking-[0.3em] focus:text-foreground"
      >
        Skip to content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
    </div>
  );
}

export function PageHeading({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
        {label}
      </span>

      <h1 className="chrome-text mt-6 font-display text-3xl leading-[1.1] tracking-[0.16em] sm:text-5xl">
        {title}
      </h1>

      {sub && (
        <p className="mt-5 font-editorial text-lg italic text-chrome/80 sm:text-xl">
          {sub}
        </p>
      )}
    </div>
  );
}
