/** Parses blocks separated by a blank line:  "Title | https://url" then the notes underneath. */
export function parseSourceBlocks(text: string): { title: string; url: string; notes: string }[] {
  return text.split(/\n\s*\n/).map((block) => {
    const [head, ...rest] = block.trim().split("\n");
    const [title, url] = (head ?? "").split("|").map((s) => s.trim());
    try { new URL(url ?? ""); } catch { return null; }
    return { title: title || url!, url: url!, notes: rest.join("\n").trim() };
  }).filter((s): s is { title: string; url: string; notes: string } => Boolean(s && s.notes));
}

