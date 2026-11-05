import { redirect } from "next/navigation";
import { getStaff } from "@/lib/admin/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSettings } from "@/lib/data/settings";
import { LoginForm } from "./login-form";
import { Notice } from "@/components/admin/layout-bits";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getStaff()) redirect("/admin");
  const settings = await getSettings();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{settings.brand.name}</h1>
        <p className="mb-6 text-sm text-slate-500">Staff sign-in</p>
        {!isSupabaseConfigured() && <div className="mb-4"><Notice tone="warn">Supabase is not configured. Add the environment variables described in DATABASE_SETUP.md.</Notice></div>}
        <LoginForm next={next} />
        <p className="mt-6 text-xs text-slate-500">Accounts are created by an administrator. There is no public registration.</p>
      </div>
    </main>
  );
}
