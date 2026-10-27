import { CONTENT_META, CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
export const revalidate = 3600;
const clean = (value: string) =>
  value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\[\]]/g, "")
    .trim();
export async function GET() {
  const base = getSiteUrl();
  const indexes = await Promise.all(
    CONTENT_TYPES.map((type) => getContentIndex(type)),
  );
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Pages",
    "",
    `- [Desktop](${base}/): Interactive desktop workspace.`,
    `- [Resume](${base}/resume): Profile and experience.`,
    `- [Contact](${base}/contact): Get in touch.`,
    `- [RSS feed](${base}/feed.xml): Recent published entries.`,
    "",
  ];
  indexes.forEach((index, i) => {
    const type = CONTENT_TYPES[i];
    const meta = CONTENT_META[type];
    lines.push(
      `## ${meta.label}`,
      "",
      `- [${meta.label}](${base}/${type}): ${meta.description}`,
    );
    for (const item of index.items)
      lines.push(
        `- [${clean(item.title)}](${base}/${type}/${encodeURIComponent(item.slug)})${item.description ? `: ${clean(item.description)}` : ""}`,
      );
    lines.push("");
  });
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": indexes.some((index) => index.error)
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
