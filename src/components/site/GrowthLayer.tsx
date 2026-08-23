import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProductBySlug } from "@/lib/products";
import { cartItems, wishlistIds } from "@/lib/commerce";
import { dispatchGrowthNotifications } from "@/lib/growth.functions";

const CART_KEY = "zzerkoff:cart:v1";
const WISHLIST_KEY = "zzerkoff:wishlist:v1";
const COMMERCE_EVENT = "zzerkoff:commerce-change";

function AccountCommerceSync() {
  useEffect(() => {
    let userId = "";
    let syncing = false;

    const push = async () => {
      if (!userId || syncing) return;
      syncing = true;
      try {
        const wishes = wishlistIds();
        const cart = cartItems();
        await Promise.all([
          (supabase as any).from("customer_wishlist").delete().eq("user_id", userId),
          (supabase as any).from("customer_cart").delete().eq("user_id", userId),
        ]);
        if (wishes.length) {
          await (supabase as any)
            .from("customer_wishlist")
            .insert(wishes.map((productId) => ({ user_id: userId, product_id: productId })));
        }
        if (cart.length) {
          await (supabase as any).from("customer_cart").insert(
            cart.map((item) => ({ user_id: userId, item_key: item.key, item_json: item })),
          );
        }
      } catch (error) {
        console.warn("[commerce-sync] push failed", error);
      } finally {
        syncing = false;
      }
    };

    const hydrate = async () => {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? "";
      if (!userId) return;
      try {
        const [{ data: remoteWishlist }, { data: remoteCart }] = await Promise.all([
          (supabase as any).from("customer_wishlist").select("product_id").eq("user_id", userId),
          (supabase as any).from("customer_cart").select("item_key,item_json").eq("user_id", userId),
        ]);

        const mergedWishlist = Array.from(
          new Set([...(remoteWishlist ?? []).map((row: any) => row.product_id), ...wishlistIds()]),
        );
        const cartMap = new Map<string, any>();
        for (const row of remoteCart ?? []) cartMap.set(row.item_key, row.item_json);
        for (const item of cartItems()) cartMap.set(item.key, item);

        localStorage.setItem(WISHLIST_KEY, JSON.stringify(mergedWishlist));
        localStorage.setItem(CART_KEY, JSON.stringify(Array.from(cartMap.values())));
        window.dispatchEvent(new Event(COMMERCE_EVENT));
        await push();
      } catch (error) {
        console.warn("[commerce-sync] unavailable until growth migration is installed", error);
      }
    };

    void hydrate();
    const { data: listener } = supabase.auth.onAuthStateChange(() => void hydrate());
    const onChange = () => void push();
    window.addEventListener(COMMERCE_EVENT, onChange);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener(COMMERCE_EVENT, onChange);
    };
  }, []);
  return null;
}

function AdminNotificationPump() {
  const location = useLocation();
  const dispatch = useServerFn(dispatchGrowthNotifications);

  useEffect(() => {
    if (!location.pathname.startsWith("/admin")) return;
    let cancelled = false;
    const run = async () => {
      try {
        if (!cancelled) await dispatch({ data: undefined });
      } catch {
        // Non-admin sessions and missing providers are intentionally silent here.
      }
    };
    void run();
    const timer = window.setInterval(() => void run(), 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [dispatch, location.pathname]);

  return null;
}

function Stars({ value }: { value: number }) {
  return <span aria-label={`${value} out of 5 stars`}>{"★".repeat(value)}{"☆".repeat(5 - value)}</span>;
}

function ProductGrowth({ slug }: { slug: string }) {
  const { data: product } = useProductBySlug(slug);
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);

  const loadReviews = async () => {
    if (!product?.id) return;
    try {
      const { data } = await (supabase as any)
        .from("product_reviews")
        .select("id,rating,title,body,verified_purchase,created_at")
        .eq("product_id", product.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      setReviews(data ?? []);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, [product?.id]);

  const average = useMemo(
    () => (reviews.length ? reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length : 0),
    [reviews],
  );

  if (!product) return null;
  const soldOut = product.stock_status === "SOLD OUT" || product.quantity_available <= 0;

  const submitReview = async () => {
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("submit_product_review", {
        p_product_id: product.id,
        p_rating: rating,
        p_title: title,
        p_body: body,
      });
      if (error) throw error;
      setTitle("");
      setBody("");
      toast.success("Review submitted for approval.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit review.");
    } finally {
      setBusy(false);
    }
  };

  const subscribe = async () => {
    const email = contact.includes("@") ? contact.trim() : "";
    const phone = email ? "" : contact.replace(/\D/g, "");
    setBusy(true);
    try {
      const { error } = await (supabase as any).rpc("subscribe_restock_alert", {
        p_product_id: product.id,
        p_email: email,
        p_phone: phone,
      });
      if (error) throw error;
      setContact("");
      toast.success("Restock alert saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save alert.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-5 pb-28 sm:px-8">
      {soldOut && (
        <div className="glass-panel rounded-[26px] p-6 sm:p-8">
          <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">RESTOCK SIGNAL</span>
          <h2 className="mt-4 font-display text-xl tracking-[0.16em] text-foreground">NOTIFY ME WHEN IT RETURNS</h2>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input className="min-w-0 flex-1 rounded-xl border border-border/60 bg-black/30 px-4 py-4 text-xs text-foreground outline-none focus:border-chrome/60" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or phone" />
            <button type="button" disabled={busy || !contact.trim()} onClick={() => void subscribe()} className="rounded-xl border border-chrome/50 px-6 py-4 text-[9px] uppercase tracking-[0.3em] text-foreground disabled:opacity-40">Notify me</button>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-[26px] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">VERIFIED BUYER REVIEWS</span>
            <h2 className="mt-4 font-display text-xl tracking-[0.16em] text-foreground">OBJECT FEEDBACK</h2>
          </div>
          <div className="text-right text-[10px] uppercase tracking-[0.24em] text-chrome">
            {reviews.length ? `${average.toFixed(1)} / 5 · ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No approved reviews yet"}
          </div>
        </div>

        {reviews.length > 0 && (
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {reviews.slice(0, 8).map((review) => (
              <article key={review.id} className="rounded-2xl border border-border/50 p-5">
                <div className="text-sm tracking-[0.16em] text-chrome"><Stars value={Number(review.rating)} /></div>
                {review.title && <h3 className="mt-3 text-sm text-foreground">{review.title}</h3>}
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{review.body}</p>
                {review.verified_purchase && <span className="mt-4 block text-[8px] uppercase tracking-[0.28em] text-chrome">Verified purchase</span>}
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 border-t border-border/50 pt-6">
          <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground">Delivered buyers can submit one review. Reviews are moderated before public display.</p>
          <div className="mt-4 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className={`text-xl ${n <= rating ? "text-chrome" : "text-muted-foreground/40"}`}>★</button>
            ))}
          </div>
          <input className="mt-4 w-full rounded-xl border border-border/60 bg-black/30 px-4 py-3 text-xs text-foreground outline-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Review title (optional)" />
          <textarea className="mt-3 w-full rounded-xl border border-border/60 bg-black/30 px-4 py-3 text-xs text-foreground outline-none" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Your experience with this object" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button type="button" disabled={busy || body.trim().length < 8} onClick={() => void submitReview()} className="rounded-xl border border-chrome/50 px-5 py-3 text-[9px] uppercase tracking-[0.28em] text-foreground disabled:opacity-40">Submit review</button>
            <Link to="/account" className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground">Sign in / view orders</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GrowthLayer() {
  const location = useLocation();
  const match = location.pathname.match(/^\/product\/([^/]+)$/);
  return (
    <>
      <AccountCommerceSync />
      <AdminNotificationPump />
      {match ? <ProductGrowth slug={decodeURIComponent(match[1]!)} /> : null}
    </>
  );
}
