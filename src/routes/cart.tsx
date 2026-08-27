import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PageShell, PageHeading } from "@/components/site/PageShell";
import { SmartImage } from "@/components/site/SmartImage";
import { useSite } from "@/lib/settings";
import {
  removeCartItem,
  updateCartQuantity,
  useCart,
} from "@/lib/commerce";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — ZZERKOFF" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "ZZERKOFF cart. Multi-item checkout is being prepared.",
      },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart();
  const site = useSite();
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return (
    <PageShell>
      <section className="px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-5xl">
          <PageHeading
            label="ZZERKOFF / FUTURE CHECKOUT"
            title="CART"
            sub="Saved now. Multi-object checkout activates later."
          />

          {items.length === 0 ? (
            <div className="glass-panel mt-12 rounded-[28px] p-10 text-center">
              <ShoppingBag aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-5 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                Your cart is empty
              </p>
              <Link
                to="/shop"
                className="mt-6 inline-flex rounded-full border border-chrome/50 px-7 py-4 text-[9px] uppercase tracking-[0.34em] text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome"
              >
                Shop objects
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="space-y-3">
                {items.map((item) => (
                  <article
                    key={item.key}
                    aria-label={`${item.name}, quantity ${item.quantity}, ${site.price(item.price)} each`}
                    className="glass-panel flex gap-4 rounded-[24px] p-4"
                  >
                    <SmartImage
                      src={item.image}
                      alt={item.name}
                      width={180}
                      height={220}
                      className="h-28 w-24 shrink-0 rounded-2xl object-cover grayscale"
                    />

                    <div className="min-w-0 flex-1">
                      <span className="text-[8px] uppercase tracking-[0.28em] text-muted-foreground">
                        {item.code} · {item.kind}
                      </span>
                      <h2 className="mt-2 truncate font-display text-sm tracking-[0.12em] text-foreground">
                        {item.name}
                      </h2>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                        {[item.color, item.size, item.finish]
                          .filter(Boolean)
                          .join(" / ") || "STANDARD"}
                      </p>
                      <p className="mt-3 text-xs tracking-[0.12em] text-chrome">
                        {site.price(item.price)}
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity for ${item.name}`}
                          onClick={() =>
                            updateCartQuantity(item.key, item.quantity - 1)
                          }
                          className="grid size-10 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome"
                        >
                          <Minus aria-hidden="true" className="size-3" />
                        </button>
                        <span className="min-w-8 text-center text-[10px] text-foreground" aria-label={`Quantity ${item.quantity}`}>
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Increase quantity for ${item.name}`}
                          onClick={() =>
                            updateCartQuantity(item.key, item.quantity + 1)
                          }
                          className="grid size-10 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-chrome"
                        >
                          <Plus aria-hidden="true" className="size-3" />
                        </button>

                        <button
                          type="button"
                          aria-label={`Remove ${item.name} from cart`}
                          onClick={() => removeCartItem(item.key)}
                          className="ml-auto inline-flex min-h-10 items-center gap-2 text-[8px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-chrome"
                        >
                          <Trash2 aria-hidden="true" className="size-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="glass-panel h-fit rounded-[26px] p-5 lg:sticky lg:top-32" aria-label="Order summary">
                <span className="text-[8px] uppercase tracking-[0.34em] text-muted-foreground">
                  Order summary
                </span>
                <div className="mt-5 flex items-center justify-between border-b border-border/50 pb-4">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                    Subtotal
                  </span>
                  <span className="text-sm tracking-[0.12em] text-foreground">
                    {site.price(subtotal)}
                  </span>
                </div>

                <label className="mt-5 block">
                  <span className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground">
                    Promo code
                  </span>
                  <div className="mt-2 flex gap-2">
                    <input
                      disabled
                      aria-label="Promo code, future cart checkout"
                      placeholder="FUTURE CART CHECKOUT"
                      className="min-w-0 flex-1 rounded-2xl border border-border/60 bg-white/[0.02] px-4 py-3 text-[9px] tracking-[0.12em] text-muted-foreground"
                    />
                    <button
                      type="button"
                      disabled
                      aria-label="Apply promo code, coming later"
                      className="rounded-2xl border border-border/50 px-4 text-[8px] uppercase tracking-[0.22em] text-muted-foreground opacity-60"
                    >
                      Apply
                    </button>
                  </div>
                </label>

                <button
                  type="button"
                  disabled
                  aria-label="Checkout coming later"
                  className="mt-6 w-full rounded-full border border-chrome/40 bg-white/[0.03] px-6 py-5 text-[9px] uppercase tracking-[0.32em] text-muted-foreground opacity-70"
                >
                  Checkout — coming later
                </button>

                <p className="mt-4 text-[9px] leading-relaxed text-muted-foreground">
                  Cart is active for saving objects and bundles. Your current single-object
                  Place Order flow remains unchanged and usable.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
