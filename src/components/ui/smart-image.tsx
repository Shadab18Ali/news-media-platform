import Image from "next/image";
import { cn } from "@/lib/utils";

function isOptimizable(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return new URL(src).hostname === host;
  } catch {
    return false;
  }
}

interface Props {
  src: string | null | undefined;
  alt: string;
  /** Tailwind aspect class, e.g. "aspect-[16/9]". Reserving it prevents layout shift. */
  aspect?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackLabel?: string;
  rounded?: boolean;
}

/** Image with a fixed aspect ratio (no CLS), responsive srcset (AVIF/WebP via next/image) and an honest fallback. */
export function SmartImage({ src, alt, aspect = "aspect-[16/9]", sizes, priority, className, fallbackLabel, rounded }: Props) {
  return (
    <div className={cn("relative w-full overflow-hidden bg-wash", aspect, rounded && "rounded-sm", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          unoptimized={!isOptimizable(src)}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-accent to-brand text-white/90" role="img" aria-label={alt || "No image"}>
          <span className="headline text-2xl text-white/80 sm:text-3xl">{(fallbackLabel || "·").slice(0, 1).toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}
