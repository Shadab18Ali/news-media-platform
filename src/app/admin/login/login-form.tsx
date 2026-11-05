"use client";
import { useActionState } from "react";
import { loginAction } from "../_actions/auth";
import { Field, FormMessage, SubmitButton, inputCls } from "@/components/admin/ui";
import type { ActionState } from "@/lib/admin/types";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email"><input id="email" name="email" type="email" required autoComplete="username" className={inputCls} /></Field>
      <Field label="Password" htmlFor="password"><input id="password" name="password" type="password" required autoComplete="current-password" className={inputCls} /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Sign in</SubmitButton>
    </form>
  );
}
