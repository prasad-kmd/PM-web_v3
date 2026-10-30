import { LEGAL_DOCUMENTS, LEGAL_HUB_ROUTE } from "@/lib/legal";
import { CONTENT_META, CONTENT_TYPES, getContentIndex } from "@/lib/notion-cms";
import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";
import {
  TAXONOMY_INDEX_MIN_ITEMS,
  TAXONOMY_META,
  getTaxonomyIndex,
  type TaxonomyKind,
} from "@/lib/taxonomy";

export const revalidate = 3600;

const clean = (value: string) =>
  value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\[\]]/g, "")
    .trim();

export async function GET() {
  const base = getSiteUrl();
  const [indexes, taxonomy] = await Promise.all([
    Promise.all(CONTENT_TYPES.map((type) => getContentIndex(type))),
    getTaxonomyIndex().catch(() => null),
  ]);
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
    `- [Legal](${base}${LEGAL_HUB_ROUTE}): Privacy, terms, disclaimer and browser-storage information.`,
    ...LEGAL_DOCUMENTS.map(
      (document) =>
        `- [${document.title}](${base}${document.route}): ${clean(document.description)}`,
    ),
    "",
  ];

  for (const kind of [
    "categories",
    "tags",
  ] as const satisfies readonly TaxonomyKind[]) {
    const meta = TAXONOMY_META[kind];
    lines.push(
      `## ${meta.label}`,
      "",
      `- [${meta.label}](${base}/${kind}): ${clean(meta.description)}`,
    );
    for (const term of taxonomy?.terms[kind] ?? []) {
      if (term.count < TAXONOMY_INDEX_MIN_ITEMS) continue;
      lines.push(
        `- [${clean(term.label)}](${base}/${kind}/${encodeURIComponent(term.slug)}): ${term.count} published ${term.count === 1 ? "entry" : "entries"} across all collections.`,
      );
    }
    lines.push("");
  }

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

  const incomplete =
    indexes.some((index) => index.error) || !taxonomy || !taxonomy.complete;
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": incomplete
        ? "no-store"
        : "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
