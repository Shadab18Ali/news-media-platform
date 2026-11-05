"use server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

const newsletterSchema = z.object({
  email: z.email("Enter a valid email address").max(254).transform((v) => v.trim().toLowerCase()),
  source: z.string().max(40).optional(),
  consent: z.literal("on", "Please confirm your consent"),
});

export async function subscribeNewsletter(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thanks for subscribing!" }; // honeypot: pretend success
  const ip = await clientIp();
  if (!rateLimit(`newsletter:${ip}`, 5, 10 * 60_000).ok) return { ok: false, message: "Too many attempts. Please try again later." };

  const parsed = newsletterSchema.safeParse({
    email: formData.get("email"), source: formData.get("source") ?? undefined, consent: formData.get("consent") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, message: Object.values(z.flattenError(parsed.error).fieldErrors).flat()[0] ?? "Invalid input" };
  }
  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "Subscriptions are not available yet." };

  const { email, source } = parsed.data;
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email, source: source ?? "site" });
  // The unique index is on lower(email); a duplicate simply means they are already subscribed.
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("[newsletter]", error.message);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  if (error) {
    // Re-subscribe someone who previously unsubscribed.
    await supabase.from("newsletter_subscribers").update({ status: "subscribed", unsubscribed_at: null }).ilike("email", email);
  }
  return { ok: true, message: "Thanks for subscribing!" };
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.email("Enter a valid email address").max(254),
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
});

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  if (formData.get("website")) return { ok: true, message: "Thank you. Your message has been sent." };
  const ip = await clientIp();
  if (!rateLimit(`contact:${ip}`, 3, 10 * 60_000).ok) return { ok: false, message: "Too many messages. Please try again later." };

  const parsed = contactSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"),
    subject: formData.get("subject") || undefined, message: formData.get("message"),
  });
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors, message: "Please fix the highlighted fields." };

  const supabase = createServiceClient();
  if (!supabase) return { ok: false, message: "The contact form is not available yet. Please email us instead." };
  const { error } = await supabase.from("contact_messages").insert(parsed.data);
  if (error) {
    console.error("[contact]", error.message);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true, message: "Thank you. Your message has been sent." };
}

/** Counts a view once per visitor per article per day (cookie-guarded). */
export async function recordView(articleId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(articleId)) return;
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const key = `v_${articleId.slice(0, 8)}`;
  if (jar.get(key)) return;
  const ip = await clientIp();
  if (!rateLimit(`view:${ip}`, 120, 60 * 60_000).ok) return;
  const { createPublicClient } = await import("@/lib/supabase/public");
  const supabase = createPublicClient();
  if (!supabase) return;
  await supabase.rpc("increment_article_views", { p_article_id: articleId });
  jar.set(key, "1", { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", path: "/" });
}
