import {
  CONTENT_TYPES,
  getContentDetail,
  getContentIndex,
  getFreshNotionImageUrl,
  type ContentType,
  type NotionBlock,
} from "@/lib/notion-cms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const validId = (id: string | null): id is string =>
  !!id &&
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
    id,
  );
const sameId = (a: string, b: string) =>
  a.replaceAll("-", "").toLowerCase() === b.replaceAll("-", "").toLowerCase();
function containsBlock(blocks: NotionBlock[], id: string): boolean {
  return blocks.some(
    (block) =>
      sameId(block.id, id) ||
      (block.children && containsBlock(block.children, id)),
  );
}

/** Resolve expiring Notion file URLs without exposing resources from draft pages. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const resource = query.get("type");
  const id = query.get("id");
  const collection = query.get("collection");
  const pageId = query.get("page");
  const source = query.get("source");
  if (
    (resource !== "page" && resource !== "block") ||
    !validId(id) ||
    !collection ||
    !CONTENT_TYPES.includes(collection as ContentType) ||
    (source !== null && (source !== "thumbnail" || resource !== "page"))
  ) {
    return new Response("Not found", { status: 404 });
  }
  const type = collection as ContentType;
  try {
    const index = await getContentIndex(type);
    if (!index.configured || index.error)
      return new Response("Image unavailable", { status: 503 });
    if (resource === "page") {
      const allowed = index.items.some(
        (item) =>
          sameId(item.id, id) ||
          (source !== "thumbnail" && item.author && sameId(item.author.id, id)),
      );
      if (!allowed) return new Response("Not found", { status: 404 });
    } else {
      if (!validId(pageId)) return new Response("Not found", { status: 404 });
      const item = index.items.find((entry) => sameId(entry.id, pageId));
      if (!item) return new Response("Not found", { status: 404 });
      const detail = await getContentDetail(type, item.slug);
      if (detail.error)
        return new Response("Image unavailable", { status: 503 });
      if (!containsBlock(detail.blocks, id))
        return new Response("Not found", { status: 404 });
    }
    const url = await getFreshNotionImageUrl(
      resource,
      id,
      source === "thumbnail" ? "thumbnail" : "default",
    );
    if (!url) return new Response("Not found", { status: 404 });
    return new Response(null, {
      status: 307,
      headers: {
        Location: url,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Image unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
