import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { ChevronDown, GripVertical, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ensureAdmin } from "@/lib/admin.functions";
import { AdminButton } from "@/components/admin/AdminUI";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV_ITEMS = [
  { label: "DASHBOARD", to: "/admin" as const },
  { label: "AI STUDIO", to: "/admin/ai" as const },
  { label: "ORDERS", to: "/admin/orders" as const },
  { label: "PRE-ORDER", to: "/admin/preorders" as const },
  { label: "OBJECTS", to: "/admin/products" as const },
  { label: "BULK IMPORT", to: "/admin/products/bulk" as const },
  { label: "CATEGORIES", to: "/admin/categories" as const },
  { label: "NEW OBJECT", to: "/admin/products/new" as const },
  { label: "COLLECTIONS", to: "/admin/collections" as const },
  { label: "BANNERS", to: "/admin/banners" as const },
  { label: "MERCH", to: "/admin/merchandising" as const },
  { label: "ARCHIVE", to: "/admin/archive" as const },
  { label: "PAGES", to: "/admin/pages" as const },
  { label: "BLOG", to: "/admin/blog" as const },
  { label: "COMMERCE", to: "/admin/commerce" as const },
  { label: "GROWTH", to: "/admin/growth" as const },
  { label: "SETTINGS", to: "/admin/settings" as const },
  { label: "ERP", to: "/erp" as const },
] as const;

type NavItem = (typeof NAV_ITEMS)[number];
const NAV_STORAGE_KEY = "zzerkoff-admin-nav-order-v1";
const defaultOrder = NAV_ITEMS.map((item) => item.label);

function orderNavItems(order: string[]) {
  const map = new Map<string, NavItem>(NAV_ITEMS.map((item) => [item.label, item]));
  const ordered = order.map((label) => map.get(label)).filter(Boolean) as NavItem[];
  const missing = NAV_ITEMS.filter((item) => !order.includes(item.label));
  return [...ordered, ...missing];
}

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const check = useServerFn(ensureAdmin);
  const [mobileMore, setMobileMore] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>(defaultOrder);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NAV_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setNavOrder(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      // Keep default order if storage is unavailable or malformed.
    }
  }, []);

  const saveOrder = (next: string[]) => {
    setNavOrder(next);
    try {
      window.localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore private browsing/storage failures.
    }
  };

  const orderedNav = useMemo(() => orderNavItems(navOrder), [navOrder]);
  const mobileMain = orderedNav.slice(0, 5);
  const mobileMoreItems = orderedNav.slice(5);

  const moveItem = (fromLabel: string, toLabel: string) => {
    if (fromLabel === toLabel) return;
    const current = orderedNav.map((item) => item.label);
    const fromIndex = current.indexOf(fromLabel);
    const toIndex = current.indexOf(toLabel);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved!);
    saveOrder(next);
  };

  const moveByStep = (label: string, direction: -1 | 1) => {
    const current = orderedNav.map((item) => item.label);
    const index = current.indexOf(label);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    saveOrder(next);
  };

  const resetNav = () => saveOrder(defaultOrder);

  const onDragStart = (event: DragEvent<HTMLElement>, label: string) => {
    setDragging(label);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", label);
  };

  const onDrop = (event: DragEvent<HTMLElement>, targetLabel: string) => {
    event.preventDefault();
    const source = event.dataTransfer.getData("text/plain") || dragging;
    if (source) moveItem(source, targetLabel);
    setDragging(null);
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-access"],
    retry: false,
    queryFn: () => check({ data: undefined }),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/admin/login", replace: true });
  };

  const navLinkClass =
    "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/50 px-3 py-2 text-[8px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground";

  return (
    <div className="relative min-h-screen bg-background">
      <div className="grain-overlay" />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="glass-panel rounded-[24px] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/"
              className="font-display text-sm tracking-[0.3em] text-foreground"
            >
              ZZERKOFF
            </Link>
            <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
              STUDIO
            </span>

            <div className="ml-auto flex items-center gap-2">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden rounded-xl border border-border/60 px-4 py-3 text-[9px] uppercase tracking-[0.3em] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
              >
                View website
              </a>
              <AdminButton onClick={signOut}>Sign out</AdminButton>
            </div>
          </div>

          <div className="mt-4 hidden items-center justify-between gap-3 border-t border-border/35 pt-3 sm:flex">
            <span className="text-[7px] uppercase tracking-[0.28em] text-muted-foreground">
              Drag menu buttons to reorder your studio shortcuts
            </span>
            <button
              type="button"
              onClick={resetNav}
              className="inline-flex items-center gap-2 rounded-lg border border-border/45 px-3 py-2 text-[7px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>

          <nav className="mt-4 hidden flex-wrap gap-2 sm:flex">
            {orderedNav.map((item) => (
              <Link
                key={item.label}
                to={item.to as any}
                draggable
                onDragStart={(event) => onDragStart(event, item.label)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, item.label)}
                activeOptions={{
                  exact: item.to === "/admin" || item.to === "/erp",
                }}
                activeProps={{
                  className: "border-chrome/60 bg-white/[0.06] text-foreground",
                }}
                className={`${navLinkClass} cursor-grab active:cursor-grabbing ${dragging === item.label ? "opacity-50" : ""}`}
              >
                <GripVertical className="size-3 opacity-60" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 sm:hidden">
            <p className="mb-2 text-[7px] uppercase tracking-[0.24em] text-muted-foreground">
              First 5 shortcuts follow your saved drag order
            </p>
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {mobileMain.map((item) => (
                <Link
                  key={item.label}
                  to={item.to as any}
                  activeOptions={{
                    exact: item.to === "/admin" || item.to === "/erp",
                  }}
                  activeProps={{
                    className: "border-chrome/60 bg-white/[0.06] text-foreground",
                  }}
                  className="shrink-0 rounded-xl border border-border/50 px-3 py-2.5 text-[8px] uppercase tracking-[0.22em] text-muted-foreground"
                >
                  {item.label}
                </Link>
              ))}

              <button
                type="button"
                onClick={() => setMobileMore((value) => !value)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border/50 px-3 py-2.5 text-[8px] uppercase tracking-[0.22em] text-muted-foreground"
              >
                More
                <ChevronDown
                  className={`size-3 transition-transform ${mobileMore ? "rotate-180" : ""}`}
                />
              </button>
            </nav>

            {mobileMore && (
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border/45 bg-black/30 p-3">
                {mobileMoreItems.map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/45 p-1">
                    <Link
                      to={item.to as any}
                      onClick={() => setMobileMore(false)}
                      className="block rounded-lg px-2 py-2 text-center text-[8px] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {item.label}
                    </Link>
                    <div className="flex justify-center gap-1 border-t border-border/25 pt-1">
                      <button
                        type="button"
                        onClick={() => moveByStep(item.label, -1)}
                        className="px-2 py-1 text-[8px] text-muted-foreground"
                        aria-label={`Move ${item.label} earlier`}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveByStep(item.label, 1)}
                        className="px-2 py-1 text-[8px] text-muted-foreground"
                        aria-label={`Move ${item.label} later`}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="col-span-2 rounded-xl border border-border/45 px-3 py-3 text-center text-[8px] uppercase tracking-[0.2em] text-muted-foreground"
                >
                  View website
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 sm:mt-10">
          {isLoading && (
            <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
              Checking access…
            </p>
          )}

          {(error || (data && !data.isAdmin)) && !isLoading && (
            <div className="glass-panel rounded-[24px] p-8">
              <h1 className="font-display text-xl tracking-[0.2em] text-foreground">
                ACCESS DENIED
              </h1>
              <p className="mt-4 text-xs tracking-[0.15em] text-muted-foreground">
                This authenticated account does not have the ZZERKOFF administrator role.
              </p>
              <div className="mt-6">
                <AdminButton onClick={signOut}>Use another account</AdminButton>
              </div>
            </div>
          )}

          {data?.isAdmin && <Outlet />}
        </div>
      </div>
    </div>
  );
}
