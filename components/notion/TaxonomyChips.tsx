import Link from "next/link";
import {
  taxonomyHref,
  taxonomySlug,
  type TaxonomyKind,
} from "@/lib/taxonomy-slug";

/**
 * Clickable category/tag chips.
 *
 * `Categories` link to `/categories/<slug>`. `Tags` and `Technical` both
 * link to `/tags/<slug>` (one tags index, two labelled Notion facets), so
 * deduplication treats them as one pool while the groups stay separate.
 */
export function TaxonomyChip({
  kind,
  label,
}: {
  kind: TaxonomyKind;
  label: string;
}) {
  const href = taxonomyHref(kind, label);
  if (!href) return <span>{label}</span>;
  return (
    <Link className="tax-chip" href={href}>
      {label}
    </Link>
  );
}

function uniqueLabels(labels: string[], seen: Set<string>): string[] {
  const result: string[] = [];
  for (const raw of labels) {
    const label = raw.trim();
    const slug = taxonomySlug(label) || label.toLowerCase();
    if (!label || seen.has(slug)) continue;
    seen.add(slug);
    result.push(label);
  }
  return result;
}

export function TaxonomyGroups({
  categories,
  tags,
  technical,
}: {
  categories: string[];
  tags: string[];
  technical: string[];
}) {
  const seenTagsPool = new Set<string>();
  const allGroups: Array<{
    title: string;
    kind: TaxonomyKind;
    labels: string[];
  }> = [
    {
      title: "Categories",
      kind: "categories",
      labels: uniqueLabels(categories, new Set()),
    },
    { title: "Tags", kind: "tags", labels: uniqueLabels(tags, seenTagsPool) },
    {
      title: "Technical",
      kind: "tags",
      labels: uniqueLabels(technical, seenTagsPool),
    },
  ];
  const groups = allGroups.filter((group) => group.labels.length > 0);

  if (!groups.length) return null;

  return (
    <div className="rdr-topic-groups">
      {groups.map((group) => (
        <section
          key={group.title}
          className="rdr-topic-group"
          aria-label={group.title}
        >
          <h3>{group.title}</h3>
          <ul className="rdr-topics">
            {group.labels.map((label) => {
              const href = taxonomyHref(group.kind, label);
              return (
                <li key={`${group.title}:${label}`}>
                  {href ? <Link href={href}>{label}</Link> : label}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
