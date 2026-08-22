import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: {
  userId: string;
  supabase: any;
}) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .limit(1);

  if (error) throw error;
  if (!roles || roles.length === 0) throw new Error("Forbidden");
}

export const ensureAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .limit(1);

    if (error) {
      console.error("[ensureAdmin] role lookup failed", {
        userId: context.userId,
        email: (context.claims as { email?: string })?.email,
        error: error.message,
      });
      throw error;
    }

    const isAdmin = (roles ?? []).length > 0;
    if (!isAdmin) {
      console.warn("[ensureAdmin] no admin role", {
        userId: context.userId,
        email: (context.claims as { email?: string })?.email,
      });
    }

    return { isAdmin };
  });


export const peekProductCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ category: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: code, error } = await context.supabase.rpc(
      "peek_product_code",
      {
        _category: data.category,
      },
    );

    if (error) throw error;

    return { code: code as string };
  });

export const reserveProductCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ category: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { data: code, error } = await context.supabase.rpc(
      "next_product_code",
      {
        _category: data.category,
      },
    );

    if (error) throw error;

    return { code: code as string };
  });

export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        action: z.string().min(1).max(40),
        entity: z.string().min(1).max(40),
        entity_id: z.string().max(120).optional(),
        label: z.string().max(200).optional(),
        details: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const { error } = await context.supabase
      .from("admin_audit_log")
      .insert({
        actor_id: context.userId,
        actor_email:
          (context.claims as { email?: string })?.email ?? "",
        action: data.action,
        entity: data.entity,
        entity_id: data.entity_id ?? null,
        label: data.label ?? "",
        details: (data.details ?? {}) as never,
      });

    if (error) throw error;

    return { ok: true };
  });
