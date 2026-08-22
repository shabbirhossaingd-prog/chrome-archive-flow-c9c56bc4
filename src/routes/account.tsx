import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { Copy, LogOut, MapPin, PackageCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageShell, PageHeading } from "@/components/site/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { useSite } from "@/lib/settings";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — ZZERKOFF" },
      { name: "robots", content: "noindex,nofollow" },
      {
        name: "description",
        content: "ZZERKOFF customer account, orders and saved addresses.",
      },
    ],
  }),
  component: AccountPage,
});

const inputClass =
  "w-full rounded-2xl border border-border/65 bg-white/[0.02] px-4 py-4 text-xs tracking-[0.06em] text-foreground outline-none placeholder:text-muted-foreground/55 focus:border-chrome/60";

function AccountPage() {
  const site = useSite();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressName, setAddressName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [mapUrl, setMapUrl] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setAuthReady(true);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? "";

  const profileQuery = useQuery({
    queryKey: ["customer-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setDisplayName(profileQuery.data.display_name || "");
    setPhone(profileQuery.data.phone || "");
  }, [profileQuery.data]);

  const addressesQuery = useQuery({
    queryKey: ["customer-addresses", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customer_addresses")
        .select("*")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select(
          "id,order_number,status,product_name,product_code,total_price,payment_method,payment_status,phone,created_at",
        )
        .eq("customer_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const authMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || password.length < 6) {
        throw new Error("Enter a valid email and a password of at least 6 characters.");
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        return { session: data.session, signup: true };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      return { session: data.session, signup: false };
    },
    onSuccess: (result) => {
      if (result.signup && !result.session) {
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        toast.success("Signed in.");
      }
      setPassword("");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not continue."),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first.");
      const { error } = await (supabase as any)
        .from("customer_profiles")
        .upsert(
          {
            user_id: userId,
            display_name: displayName.trim(),
            phone: phone.trim(),
          },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved.");
      queryClient.invalidateQueries({ queryKey: ["customer-profile", userId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save profile."),
  });

  const addAddress = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sign in first.");
      if (fullAddress.trim().length < 5) throw new Error("Enter the full address.");

      const isFirst = (addressesQuery.data ?? []).length === 0;
      const { error } = await (supabase as any).from("customer_addresses").insert({
        user_id: userId,
        label: addressLabel.trim() || "Home",
        recipient_name: addressName.trim(),
        phone: addressPhone.trim(),
        full_address: fullAddress.trim(),
        map_url: mapUrl.trim() || null,
        is_default: isFirst,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Address saved.");
      setFullAddress("");
      setMapUrl("");
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", userId] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save address."),
  });

  const removeAddress = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("customer_addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", userId] }),
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not remove address."),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("customer_addresses")
        .update({ is_default: true })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["customer-addresses", userId] }),
  });

  if (!authReady) {
    return (
      <PageShell>
        <section className="px-5 pb-24 pt-36 text-center">
          <p className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground">
            Opening account…
          </p>
        </section>
      </PageShell>
    );
  }

  if (!session) {
    return (
      <PageShell>
        <section className="px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
          <div className="mx-auto max-w-lg">
            <PageHeading
              label="ZZERKOFF / CUSTOMER"
              title="ACCOUNT"
              sub="Orders and saved addresses in one place."
            />

            <div className="glass-panel mt-10 rounded-[28px] p-5 sm:p-7">
              <div className="flex gap-2">
                {(["signin", "signup"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`flex-1 rounded-2xl border px-4 py-3 text-[8px] uppercase tracking-[0.28em] ${
                      mode === item
                        ? "border-chrome/55 bg-white/[0.05] text-foreground"
                        : "border-border/55 text-muted-foreground"
                    }`}
                  >
                    {item === "signin" ? "Sign in" : "Create account"}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  className={inputClass}
                />
                <input
                  type="password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => authMutation.mutate()}
                  disabled={authMutation.isPending}
                  className="w-full rounded-full border border-chrome/50 bg-white/[0.04] px-7 py-5 text-[9px] uppercase tracking-[0.34em] text-foreground disabled:opacity-50"
                >
                  {authMutation.isPending
                    ? "Working…"
                    : mode === "signin"
                      ? "Sign in"
                      : "Create account"}
                </button>
              </div>

              <p className="mt-5 text-[9px] leading-relaxed text-muted-foreground">
                Guest checkout stays available. Orders placed while signed in will appear
                automatically in My Orders.
              </p>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <PageHeading
              label="ZZERKOFF / CUSTOMER"
              title="MY ACCOUNT"
              sub={session.user.email || "Signed in"}
            />
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                queryClient.clear();
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 px-5 py-4 text-[8px] uppercase tracking-[0.28em] text-muted-foreground"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <div className="glass-panel rounded-[26px] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <UserRound className="size-5 text-muted-foreground" />
                <h2 className="font-display text-sm tracking-[0.16em] text-foreground">
                  PROFILE
                </h2>
              </div>

              <div className="mt-5 space-y-3">
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Name"
                  className={inputClass}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => saveProfile.mutate()}
                  disabled={saveProfile.isPending}
                  className="rounded-full border border-chrome/45 px-6 py-4 text-[8px] uppercase tracking-[0.28em] text-foreground"
                >
                  Save profile
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-[26px] p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <MapPin className="size-5 text-muted-foreground" />
                <h2 className="font-display text-sm tracking-[0.16em] text-foreground">
                  ADD ADDRESS
                </h2>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <input
                  value={addressLabel}
                  onChange={(event) => setAddressLabel(event.target.value)}
                  placeholder="Label: Home"
                  className={inputClass}
                />
                <input
                  value={addressName}
                  onChange={(event) => setAddressName(event.target.value)}
                  placeholder="Recipient name"
                  className={inputClass}
                />
                <input
                  value={addressPhone}
                  onChange={(event) => setAddressPhone(event.target.value)}
                  placeholder="Phone"
                  className={inputClass}
                />
                <input
                  value={mapUrl}
                  onChange={(event) => setMapUrl(event.target.value)}
                  placeholder="Map link (optional)"
                  className={inputClass}
                />
                <textarea
                  rows={3}
                  value={fullAddress}
                  onChange={(event) => setFullAddress(event.target.value)}
                  placeholder="Full delivery address"
                  className={`${inputClass} sm:col-span-2`}
                />
              </div>

              <button
                type="button"
                onClick={() => addAddress.mutate()}
                disabled={addAddress.isPending}
                className="mt-4 rounded-full border border-chrome/45 px-6 py-4 text-[8px] uppercase tracking-[0.28em] text-foreground"
              >
                Save address
              </button>
            </div>
          </div>

          <div className="glass-panel mt-5 rounded-[26px] p-5 sm:p-6">
            <h2 className="font-display text-sm tracking-[0.16em] text-foreground">
              SAVED ADDRESSES
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(addressesQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No saved addresses yet.</p>
              ) : (
                (addressesQuery.data ?? []).map((address: any) => (
                  <article
                    key={address.id}
                    className="rounded-[22px] border border-border/45 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[8px] uppercase tracking-[0.26em] text-muted-foreground">
                        {address.label}
                      </span>
                      {address.is_default ? (
                        <span className="text-[8px] uppercase tracking-[0.22em] text-chrome">
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-foreground">
                      {address.full_address}
                    </p>
                    <p className="mt-2 text-[9px] text-muted-foreground">
                      {[address.recipient_name, address.phone].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-4 flex gap-4">
                      {!address.is_default && (
                        <button
                          type="button"
                          onClick={() => setDefault.mutate(address.id)}
                          className="text-[8px] uppercase tracking-[0.22em] text-chrome"
                        >
                          Make default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAddress.mutate(address.id)}
                        className="text-[8px] uppercase tracking-[0.22em] text-muted-foreground"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel mt-5 rounded-[26px] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <PackageCheck className="size-5 text-muted-foreground" />
              <h2 className="font-display text-sm tracking-[0.16em] text-foreground">
                MY ORDERS
              </h2>
            </div>

            <div className="mt-5 space-y-3">
              {(ordersQuery.data ?? []).length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Orders placed while signed in will appear here. Older guest orders can
                  still be tracked with Order ID + phone.
                </p>
              ) : (                (ordersQuery.data ?? []).map((order: any) => (
        <article
          key={order.id}
          className="rounded-[22px] border border-border/45 p-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
                {order.order_number}
              </span>
              <p className="mt-2 truncate text-xs tracking-[0.06em] text-foreground">
                {order.product_name}
              </p>
            </div>
            <span className="rounded-xl border border-border/45 px-3 py-2 text-[8px] uppercase tracking-[0.2em] text-muted-foreground">
              {order.status}
            </span>
            <span className="text-[10px] tracking-[0.08em] text-chrome">
              {site.price(order.total_price)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(order.order_number);
                  toast.success("Order ID copied.");
                } catch {
                  toast.error("Could not copy the order ID.");
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border/55 px-4 py-3 text-[8px] uppercase tracking-[0.22em] text-muted-foreground"
            >
              <Copy className="size-3" />
              Copy order ID
            </button>
            <a
              href={`/track-order?order=${encodeURIComponent(
                order.order_number,
              )}&phone=${encodeURIComponent(order.phone || "")}`}
              className="rounded-xl border border-chrome/45 px-4 py-3 text-[8px] uppercase tracking-[0.22em] text-foreground"
            >
              Track order
            </a>
          </div>
        </article>
      ))
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
