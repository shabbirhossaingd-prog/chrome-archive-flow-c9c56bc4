import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="page-atmosphere relative min-h-screen overflow-x-clip">
      <Header />
      <main>{children}</main>
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
