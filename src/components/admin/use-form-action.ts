"use client";
import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";
import type { ActionState } from "@/lib/admin/types";

/**
 * Like <form action={fn}> but does NOT reset the form's fields after submission (React 19 resets
 * uncontrolled inputs after every form action, which would wipe an editor's work on a validation error).
 * The clicked submit button's name/value are included, so one form can have several intents.
 * Pass `resetOnSuccess` for "create" forms that should clear after a successful save.
 */
export function useKeepAction(action: (prev: ActionState, fd: FormData) => Promise<ActionState>, opts: { resetOnSuccess?: boolean } = {}) {
  const [state, dispatch, pending] = useActionState(action, {} as ActionState);
  const formRef = useRef<HTMLFormElement | null>(null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    formRef.current = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  useEffect(() => {
    if (opts.resetOnSuccess && state.ok) formRef.current?.reset();
  }, [state, opts.resetOnSuccess]);
  return { state, onSubmit, pending };
}
