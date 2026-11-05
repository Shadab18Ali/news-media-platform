import { revalidatePath } from "next/cache";

/** Public pages are ISR-cached; call after any content/settings change. */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
