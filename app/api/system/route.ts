import { NextResponse } from "next/server";
import type { ContentType } from "@/lib/notion-cms";
import { BUILD_INFO } from "@/lib/build-info";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Collection → the environment variables that can configure it. Mirrors
 *  `DATABASE_ENV` in lib/notion-cms.ts (which is intentionally not exported). */
const COLLECTION_ENV: Record<ContentType, string[]> = {
  projects: ["NOTION_PROJECTS_ID", "NOTION_PROJECTS_DATABASE_ID"],
  blog: ["NOTION_BLOG_ID"],
  articles: ["NOTION_ARTICLES_ID"],
  tutorials: ["NOTION_TUTORIALS_ID"],
  glossary: ["NOTION_GLOSSARY_ID", "NOTION_WIKI_ID"],
  news: ["NOTION_NEWS_ID", "NOTION_NEWS_DATABASE_ID"],
};

const COLLECTIONS: ContentType[] = [
  "projects",
  "blog",
  "articles",
  "tutorials",
  "glossary",
  "news",
];

const present = (name: string) => Boolean(process.env[name]?.trim());

/**
 * GET /api/system
 *
 * Reports which Notion collections are configured and which workspace
 * integrations are present. It returns **booleans only** — never a token, an
 * id or any part of a value — so it is safe to call from the About tab.
 *
 * `no-store`: the answer changes when the deployment's environment changes.
 */
export function GET(): NextResponse {
  const notionToken = (
    process.env.NOTION_API_KEY ||
    process.env.NOTION_AUTH_TOKEN ||
    process.env.NOTION_API_TOKEN ||
    ""
  ).trim();

  const collections = COLLECTIONS.map((type) => ({
    type,
    configured:
      Boolean(notionToken) &&
      COLLECTION_ENV[type].some((name) => present(name)),
  }));

  const integrations = {
    notion: Boolean(notionToken),
    turnstile:
      present("NEXT_PUBLIC_TURNSTILE_SITE_KEY") &&
      present("TURNSTILE_SECRET_KEY"),
    telegram: present("TELEGRAM_TOKEN") && present("TELEGRAM_CHAT_ID"),
    canonicalUrl: present("NEXT_PUBLIC_SITE_URL"),
  };

  return NextResponse.json(
    {
      build: BUILD_INFO,
      collections,
      integrations,
      checkedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
