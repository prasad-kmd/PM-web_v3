import { CONTENT_META, CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
export const revalidate = 3600;
function xml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(
      /[<>&'"]/g,
      (char) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          "'": "&apos;",
          '"': "&quot;",
        })[char] || char,
    );
}
export async function GET() {
  const base = getSiteUrl();
  const indexes = await Promise.all(
    CONTENT_TYPES.map((type) => getContentIndex(type)),
  );
  const entries = indexes
    .flatMap((index) => index.items)
    .sort(
      (a, b) =>
        (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0),
    )
    .slice(0, 50);
  const items = entries
    .map((item) => {
      const url = `${base}/${item.type}/${encodeURIComponent(item.slug)}`;
      const date =
        item.date && Number.isFinite(Date.parse(item.date))
          ? `<pubDate>${new Date(item.date).toUTCString()}</pubDate>`
          : "";
      const author = item.author?.name
        ? `<dc:creator>${xml(item.author.name)}</dc:creator>`
        : "";
      const categories = [
        ...new Set([...item.categories, ...item.tags, ...item.technical]),
      ]
        .map((category) => `<category>${xml(category)}</category>`)
        .join("");
      return `<item><title>${xml(item.title)}</title><link>${xml(url)}</link><guid isPermaLink="true">${xml(url)}</guid>${date}${author}<description>${xml(item.description || `${CONTENT_META[item.type].singular}: ${item.title}`)}</description>${categories}</item>`;
    })
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${xml(SITE_NAME)}</title><link>${xml(base)}</link><description>${xml(SITE_DESCRIPTION)}</description><language>en</language><lastBuildDate>${new Date().toUTCString()}</lastBuildDate><atom:link href="${xml(`${base}/feed.xml`)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": indexes.some((index) => index.error)
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
