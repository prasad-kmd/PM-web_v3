import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/api/og", "/api/notion-image"],
        disallow: [
          "/api/",
          "/bookmarks",
          "/settings",
          "/og-studio",
          "/invoices",
          "/insights",
        ],
      },
    ],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
