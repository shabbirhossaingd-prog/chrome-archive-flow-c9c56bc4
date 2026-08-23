import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";

const BUTTON_ATTR = "data-zzerkoff-description-toggle";

function findDescription() {
  return Array.from(document.querySelectorAll<HTMLParagraphElement>("p")).find((paragraph) => {
    const parentClass = paragraph.parentElement?.className || "";
    return (
      parentClass.includes("lg:sticky") &&
      paragraph.classList.contains("font-editorial") &&
      paragraph.classList.contains("text-lg") &&
      paragraph.classList.contains("leading-relaxed") &&
      paragraph.classList.contains("text-muted-foreground")
    );
  });
}

/**
 * Keeps the existing product detail component intact while turning the long
 * full description into a compact, default-closed disclosure directly above
 * the product detail accordions. This avoids pushing the purchase actions far
 * below the fold on long AI-generated descriptions.
 */
export function ProductDescriptionAccordion() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/product/")) return;

    let stopped = false;
    let observer: MutationObserver | null = null;

    const enhance = () => {
      if (stopped) return true;
      const paragraph = findDescription();
      if (!paragraph) return false;

      const existing = paragraph.parentElement?.querySelector<HTMLButtonElement>(
        `button[${BUTTON_ATTR}="true"]`,
      );
      if (existing) return true;

      paragraph.hidden = true;
      paragraph.classList.remove("mt-8");
      paragraph.classList.add("mt-0", "pb-5", "pt-1");

      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute(BUTTON_ATTR, "true");
      button.setAttribute("aria-expanded", "false");
      button.className =
        "mt-8 flex w-full items-center justify-between border-y border-border/60 py-4 text-left text-[10px] uppercase tracking-[0.4em] text-muted-foreground transition-colors hover:text-foreground";

      const label = document.createElement("span");
      label.textContent = "DESCRIPTION";
      const arrow = document.createElement("span");
      arrow.textContent = "⌄";
      arrow.className = "text-base transition-transform duration-300";
      button.append(label, arrow);

      button.addEventListener("click", () => {
        const open = paragraph.hidden;
        paragraph.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        arrow.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
      });

      paragraph.parentElement?.insertBefore(button, paragraph);
      return true;
    };

    const firstTimer = window.setTimeout(() => {
      if (enhance()) return;
      observer = new MutationObserver(() => {
        if (enhance()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }, 0);

    return () => {
      stopped = true;
      window.clearTimeout(firstTimer);
      observer?.disconnect();
    };
  }, [location.pathname]);

  return null;
}
