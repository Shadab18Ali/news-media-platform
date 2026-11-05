import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({ title, href, id }: { title: string; href?: string; id?: string }) {
  return (
    <div className="section-rule mb-5 flex items-baseline justify-between pt-2">
      <h2 id={id} className="headline text-xl uppercase tracking-wide sm:text-2xl">{title}</h2>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
          More <ArrowRight className="h-4 w-4" aria-hidden="true" /><span className="sr-only"> from {title}</span>
        </Link>
      )}
    </div>
  );
}
