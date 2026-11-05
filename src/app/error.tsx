"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="headline text-3xl">Something went wrong</h1>
      <p className="mt-3 text-muted">We hit an unexpected problem. Please try again.</p>
      <button type="button" onClick={reset} className="mt-6 rounded bg-ink px-5 py-2.5 font-semibold text-white">Try again</button>
    </main>
  );
}
