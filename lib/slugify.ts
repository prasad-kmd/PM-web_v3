/**
 * The one slug algorithm shared by content URLs and taxonomy URLs.
 *
 * Keeping this in a dependency-free module lets server code (`notion-cms`,
 * `taxonomy`) and client-safe link builders (`TaxonomyChips`) agree on the
 * exact slug for a label such as “Control Systems” → `control-systems`
 * without either side reimplementing (and eventually drifting from) it.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
