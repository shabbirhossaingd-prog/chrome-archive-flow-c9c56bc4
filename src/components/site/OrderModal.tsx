import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  MapPin,
  TicketPercent,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type OrderModalProps = {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productCode: string;
  unitPrice: number;
  currencySymbol: string;
  size: string;
  finish: string;
  color?: string;
  quantity: number;
};

type PromoResult = {
  valid: boolean;
  code: string;
  discount_amount: number;
  final_total: number;
  message: string;
};

const inputClass =
  "w-full rounded-2xl border border-border/70 bg-white/[0.02] px-4 py-4 text-xs tracking-[0.08em] text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-chrome/70";

function rememberOrder(orderNumber: string, phone: string) {
  if (typeof window === "undefined") return;
  try {
    const key = "zzerkoff:recent-orders:v1";
    const old = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{
      orderNumber: string;
      phone: string;
      createdAt: string;
    }>;
    const next = [
      { orderNumber, phone, createdAt: new Date().toISOString() },
      ...old.filter((row) => row.orderNumber !== orderNumber),
    ].slice(0, 8);
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // local remembering is optional
  }
}

export function OrderModal({
  open,
  onClose,
  productId,
  productName,
  productCode,
  unitPrice,
  currencySymbol,
  size,
  finish,
  color = "",
  quantity,
}: OrderModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [orderNumber, setOrderNumber] = useState("");
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "bkash" | "nagad"
  >("cod");
  const [transactionId, setTransactionId] = useState("");
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoResult | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const subtotal = unitPrice * quantity;
  const total = promo?.valid ? Number(promo.final_total) : subtotal;

  const fieldClass = (key: string) =>
    `${inputClass} ${
      fieldErrors[key] ? "border-red-500/80 focus:border-red-500" : ""
    }`;

  const clearFieldError = (key: string) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // A location is attached only after the customer explicitly taps
    // "Use current location". Never reuse a saved/previous map pin.
    setMapUrl("");
    setLatitude(null);
    setLongitude(null);
    setFieldErrors({});

    (async () => {
      const { data: settingsData } = await (supabase as any)
        .from("site_settings")
        .select("cod_enabled,bkash_enabled,bkash_number,nagad_enabled,nagad_number")
        .limit(1)
        .maybeSingle();

      const settings = settingsData ?? null;
      setPaymentSettings(settings);

      if (settings?.cod_enabled !== false) {
        setPaymentMethod("cod");
      } else if (settings?.bkash_enabled) {
        setPaymentMethod("bkash");
      } else if (settings?.nagad_enabled) {
        setPaymentMethod("nagad");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) return;

      setEmail((current) => current || session.user.email || "");

      const [{ data: profile }, { data: savedAddress }] = await Promise.all([
        (supabase as any)
          .from("customer_profiles")
          .select("display_name,phone")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        (supabase as any)          .from("customer_addresses")
.select("recipient_name,phone,full_address")
          .eq("user_id", session.user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setName(
        (current) =>
          current ||
          savedAddress?.recipient_name ||
          profile?.display_name ||
          "",
      );
      setPhone(
        (current) =>
          current || savedAddress?.phone || profile?.phone || "",
      );
      setAddress((current) => current || savedAddress?.full_address || "");
    })();
  }, [open]);

  useEffect(() => {
    // Quantity / price changed: force re-apply so the server calculates again.
    setPromo(null);
  }, [subtotal]);

  const variantText = useMemo(
    () => [color, size, finish].filter(Boolean).join(" / ") || "STANDARD",
    [color, size, finish],
  );

  if (!open) return null;

  const close = () => {
    setError("");
    setOrderNumber("");
    setPlacedTotal(null);
    setPromo(null);
    setPromoInput("");
    setCopied(false);
    setTransactionId("");
    setMapUrl("");
    setLatitude(null);
    setLongitude(null);
    setFieldErrors({});
    onClose();
  };

  const useCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError(
        "Current location is not supported on this device. You can still type your address.",
      );
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setMapUrl(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${lat},${lng}`,
          )}`,
        );
        setLocating(false);
      },
      () => {
        setMapUrl("");
        setLatitude(null);
        setLongitude(null);
        setError(
          "Location permission was blocked. Type your full delivery address instead.",
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      },
    );
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) {
      setPromo(null);
      setError("Enter a promo code first.");
      return;
    }

    setPromoBusy(true);
    setError("");

    const { data, error: promoError } = await (supabase as any).rpc(
      "preview_promo_code",
      {
        p_code: promoInput.trim(),
        p_subtotal: subtotal,
      },
    );

    setPromoBusy(false);

    if (promoError) {
      setPromo(null);
      setError(promoError.message || "Could not check promo code.");
      return;
    }

    const row = (Array.isArray(data) ? data[0] : data) as PromoResult | null;
    if (!row?.valid) {
      setPromo(null);
      setError(row?.message || "Promo code is not valid.");
      return;
    }

    setPromo({
      ...row,
      discount_amount: Number(row.discount_amount || 0),
      final_total: Number(row.final_total || subtotal),
    });
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    const phoneDigits = phone.replace(/\D/g, "");
    const normalizedPhone =
      phoneDigits.length === 13 && phoneDigits.startsWith("8801")
        ? `0${phoneDigits.slice(3)}`
        : phoneDigits;

    if (name.trim().length < 2) {
      nextErrors.name = "Enter your full name.";
    }
    if (normalizedPhone.length !== 11 || !normalizedPhone.startsWith("01")) {
      nextErrors.phone = "Enter a valid 11-digit Bangladesh mobile number.";
    }
    if (address.trim().length < 5) {
      nextErrors.address = "Enter your full delivery address.";
    }
    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      nextErrors.email = "Enter a valid email or leave it blank.";
    }
    if (paymentMethod !== "cod" && transactionId.trim().length < 4) {
      nextErrors.transactionId = "Enter the payment transaction ID.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError("Please complete the highlighted fields before placing the order.");
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    setError("");

    const { data, error: submitError } = await (supabase as any).rpc(
      "create_commerce_order",
      {
        p_product_id: productId,
        p_customer_name: name.trim(),
        p_phone: normalizedPhone,
        p_address: address.trim(),
        p_size: size || null,
        p_finish: finish || null,
        p_color: color || null,
        p_quantity: quantity,
        p_map_url: mapUrl || null,
        p_latitude: latitude,
        p_longitude: longitude,
        p_note: note.trim() || null,
        p_payment_method: paymentMethod,
        p_transaction_id:
          paymentMethod === "cod" ? null : transactionId.trim(),
        p_promo_code: promo?.valid ? promo.code : null,
        p_customer_email: email.trim() || null,
      },
    );

    setSubmitting(false);

    if (submitError) {
      setError(
        submitError.message ||
          "Could not place the order. Please try again.",
      );
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const nextOrderNumber = result?.order_number ?? "ORDER RECEIVED";
    setOrderNumber(nextOrderNumber);
    setPlacedTotal(Number(result?.total_price ?? total));
    rememberOrder(nextOrderNumber, normalizedPhone);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur-md sm:py-10">
      <div className="mx-auto flex min-h-full max-w-xl items-center justify-center">
        <div className="glass-panel relative w-full overflow-hidden rounded-[28px] border border-border/70 bg-background/95 p-5 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={close}
            aria-label="Close order form"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>

          {orderNumber ? (
            <div className="py-8 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-full border border-chrome/60 bg-white/[0.04]">
                <Check className="size-5 text-foreground" />
              </div>
              <span className="mt-7 block text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
                ZZERKOFF / ORDER
              </span>
              <h2 className="mt-4 font-display text-xl tracking-[0.2em] text-foreground sm:text-2xl">
                ORDER RECEIVED
              </h2>

              <div className="mx-auto mt-6 max-w-sm rounded-[20px] border border-border/60 bg-white/[0.02] p-4 text-left">
                <span className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                  Order ID
                </span>
                <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-chrome">
                  {orderNumber}
                </p>

                <div className="mt-4 flex items-end justify-between gap-4 border-t border-border/40 pt-4">
                  <div>
                    <p className="font-display text-xs tracking-[0.12em] text-foreground">
                      {productName}
                    </p>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.25em] text-muted-foreground">
                      {variantText} · QTY {quantity} · {paymentMethod}
                    </p>
                    {promo?.valid ? (
                      <p className="mt-2 text-[8px] uppercase tracking-[0.22em] text-chrome">
                        Promo {promo.code} applied
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs tracking-[0.14em] text-foreground">
                    {currencySymbol}
                    {Number(placedTotal ?? total).toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <p className="mx-auto mt-6 max-w-sm text-xs leading-relaxed tracking-[0.08em] text-muted-foreground">
                Keep your order ID. If you were signed in, this order will also
                appear under My Account.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(orderNumber);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                  className="rounded-full border border-border/70 px-6 py-5 text-[9px] uppercase tracking-[0.32em] text-muted-foreground transition-colors hover:border-chrome/60 hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="size-3.5" />
                    {copied ? "Copied" : "Copy order ID"}
                  </span>
                </button>
                <a
                  href="/track-order"
                  className="rounded-full border border-chrome/50 bg-white/[0.04] px-6 py-5 text-[9px] uppercase tracking-[0.32em] text-foreground transition-colors hover:bg-white/[0.08]"
                >
                  Track order
                </a>
              </div>

              <button
                type="button"
                onClick={close}
                className="mt-3 w-full rounded-full border border-border/50 px-8 py-5 text-[9px] uppercase tracking-[0.34em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              <span className="text-[9px] uppercase tracking-[0.45em] text-muted-foreground">
                ZZERKOFF / CHECKOUT
              </span>
              <h2 className="mt-4 pr-12 font-display text-xl tracking-[0.2em] text-foreground">
                PLACE ORDER
              </h2>

              <div className="mt-6 rounded-[20px] border border-border/60 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                      {productCode}
                    </span>
                    <p className="mt-2 font-display text-sm tracking-[0.14em] text-foreground">
                      {productName}
                    </p>
                    <p className="mt-2 text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
                      {variantText} · QTY {quantity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {promo?.valid ? (
                      <p className="text-[9px] text-muted-foreground line-through">
                        {currencySymbol}
                        {subtotal.toLocaleString("en-US")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs tracking-[0.18em] text-chrome">
                      {currencySymbol}
                      {total.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[20px] border border-border/60 bg-white/[0.015] p-4">
                <label className="text-[8px] uppercase tracking-[0.32em] text-muted-foreground">
                  Promo / coupon
                </label>
                <div className="mt-3 flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(event) => {
                      setPromoInput(event.target.value.toUpperCase());
                      if (promo) setPromo(null);
                    }}
                    placeholder="ENTER CODE"
                    className={`${inputClass} min-w-0 flex-1 py-3`}
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={promoBusy}
                    className="inline-flex items-center gap-2 rounded-2xl border border-chrome/45 px-4 text-[8px] uppercase tracking-[0.23em] text-foreground disabled:opacity-50"
                  >
                    <TicketPercent className="size-3.5" />
                    {promoBusy ? "Checking" : "Apply"}
                  </button>
                </div>
                {promo?.valid ? (
                  <p className="mt-3 text-[9px] text-chrome">
                    {promo.code}: −{currencySymbol}
                    {promo.discount_amount.toLocaleString("en-US")}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Name *
                  </label>
                  <input                    value={name}
          onChange={(event) => {
            setName(event.target.value);
            clearFieldError("name");
          }}
          autoComplete="name"
          placeholder="Your name"
          className={fieldClass("name")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Phone number *
                  </label>
                  <input
                    type="tel"                    value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            clearFieldError("phone");
          }}
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          className={fieldClass("phone")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"                    value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError("email");
          }}
          autoComplete="email"
          placeholder="Optional — for future order emails"
          className={fieldClass("email")}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Full delivery address *
                  </label>
                  <textarea
                    rows={3}                    value={address}
          onChange={(event) => {
            setAddress(event.target.value);
            clearFieldError("address");
          }}
          autoComplete="street-address"
          placeholder="House / road / area / district"
          className={`${fieldClass("address")} resize-none leading-relaxed`}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    disabled={locating}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border/70 px-5 py-4 text-[9px] uppercase tracking-[0.32em] text-muted-foreground transition-colors hover:border-chrome/60 hover:text-foreground disabled:opacity-60"
                  >
                    {locating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : mapUrl ? (
                      <Check className="size-4" />
                    ) : (
                      <MapPin className="size-4" />
                    )}
                    {locating
                      ? "Getting location..."
                      : mapUrl
                        ? "Location captured"
                        : "Use current location"}
                  </button>

                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 flex items-center justify-center gap-2 text-[8px] uppercase tracking-[0.3em] text-chrome transition-colors hover:text-foreground"
                    >
                      View map pin
                      <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Payment method
                  </label>

                  <div className="space-y-2">
                    {paymentSettings?.cod_enabled !== false && (
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod("cod");
                          setTransactionId("");
                        }}
                        className={`w-full rounded-2xl border px-4 py-4 text-left ${
                          paymentMethod === "cod"
                            ? "border-chrome/60 bg-white/[0.05]"
                            : "border-border/60 bg-white/[0.02]"
                        }`}
                      >
                        <span className="text-[9px] uppercase tracking-[0.28em] text-foreground">
                          Cash on delivery
                        </span>
                      </button>
                    )}

                    {paymentSettings?.bkash_enabled &&
                      paymentSettings?.bkash_number && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("bkash");
                            setTransactionId("");
                          }}
                          className={`w-full rounded-2xl border px-4 py-4 text-left ${
                            paymentMethod === "bkash"
                              ? "border-chrome/60 bg-white/[0.05]"
                              : "border-border/60 bg-white/[0.02]"
                          }`}
                        >
                          <span className="block text-[9px] uppercase tracking-[0.28em] text-foreground">
                            bKash
                          </span>
                          <span className="mt-2 block text-[9px] tracking-[0.12em] text-muted-foreground">
                            Send Money to: {paymentSettings.bkash_number}
                          </span>
                          <span className="mt-1 block text-[9px] tracking-[0.12em] text-chrome">
                            Amount: {currencySymbol}
                            {total.toLocaleString("en-US")}
                          </span>
                        </button>
                      )}

                    {paymentSettings?.nagad_enabled &&
                      paymentSettings?.nagad_number && (
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentMethod("nagad");
                            setTransactionId("");
                          }}
                          className={`w-full rounded-2xl border px-4 py-4 text-left ${
                            paymentMethod === "nagad"
                              ? "border-chrome/60 bg-white/[0.05]"
                              : "border-border/60 bg-white/[0.02]"
                          }`}
                        >
                          <span className="block text-[9px] uppercase tracking-[0.28em] text-foreground">
                            Nagad
                          </span>
                          <span className="mt-2 block text-[9px] tracking-[0.12em] text-muted-foreground">
                            Send Money to: {paymentSettings.nagad_number}
                          </span>
                          <span className="mt-1 block text-[9px] tracking-[0.12em] text-chrome">
                            Amount: {currencySymbol}
                            {total.toLocaleString("en-US")}
                          </span>
                        </button>
                      )}
                  </div>

                  {paymentMethod !== "cod" && (
                    <div className="mt-3">
                      <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                        Transaction ID *
                      </label>
                      <input                        value={transactionId}
              onChange={(event) => {
                setTransactionId(event.target.value);
                clearFieldError("transactionId");
              }}
              placeholder="Enter TrxID"
              className={fieldClass("transactionId")}
                      />
                      <p className="mt-2 text-[8px] leading-relaxed text-muted-foreground">
                        Never share your PIN or OTP. Payment is verified manually.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-[8px] uppercase tracking-[0.35em] text-muted-foreground">
                    Order note
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional"
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                </div>
              </div>              {error && (
      <div className="mt-5 rounded-2xl border border-red-500/45 bg-red-500/[0.05] px-4 py-3 text-[10px] leading-relaxed text-red-100">
        <p>{error}</p>
        {Object.keys(fieldErrors).length > 0 && (
          <ul className="mt-2 space-y-1 text-[9px] text-red-200/90">
            {Object.values(fieldErrors).map((message) => (
              <li key={message}>• {message}</li>
            ))}
          </ul>
        )}
      </div>
    )}

              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border border-chrome/55 bg-white/[0.04] px-8 py-6 text-[10px] uppercase tracking-[0.4em] text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUpRight className="size-4" />
                )}
                {submitting ? "Placing order…" : "Confirm order"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
