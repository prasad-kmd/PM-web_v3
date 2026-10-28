import { NextResponse } from "next/server";
import { getLatestContent } from "@/lib/latest";
import { buildResumePdf, type ResumePdfProject } from "@/lib/resume/pdf";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * GET /api/resume/pdf
 *
 * The résumé as a downloadable PDF. Projects come from the same projection the
 * page uses, so the download and the page never disagree; if the collection is
 * not configured the curated selection is used instead.
 */
export async function GET() {
  let projects: ResumePdfProject[] | undefined;

  try {
    const latest = await getLatestContent(["projects"], 4);
    if (latest.items.length) {
      projects = latest.items.map((item) => ({
        title: item.title,
        summary: item.summary,
        meta: [
          item.category || item.typeLabel,
          item.dateLabel || "",
          item.readTime ? `${item.readTime} min read` : "",
        ]
          .filter(Boolean)
          .join("  |  "),
      }));
    }
  } catch {
    // Fall back to the curated list inside the builder.
  }

  const pdf = buildResumePdf(projects);

  return new NextResponse(pdf as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'attachment; filename="Prasad-Madhuranga-Resume.pdf"',
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
