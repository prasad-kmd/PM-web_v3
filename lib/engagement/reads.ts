import "server-only";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { clientIp } from "@/lib/comments/request-context";
import {
  CONTENT_META,
  CONTENT_TYPES,
  type ContentType,
} from "@/lib/content-types";
import type {
  InsightsBreakdownRow,
  InsightsCollectionFilter,
  InsightsCollectionRow,
  InsightsDailyPoint,
  InsightsEntryRow,
  InsightsRange,
  InsightsReport,
} from "@/lib/engagement/types";
import {
  decodeRtdbKey,
  encodeRtdbKey,
  isFirebaseConfigured,
  rtdbGet,
  rtdbPatch,
} from "@/lib/firebase/rtdb";
import { getContentIndex } from "@/lib/notion-cms";
import { cleanEnvValue } from "@/lib/telegram";

const COLOMBO_OFFSET_MS = (5 * 60 + 30) * 60_000;
const HALF_DAY_MS = 12 * 60 * 60_000;
const MAX_DEDUP_KEYS = 10_000;
const SLUG_RE = /^[a-z0-9][a-z0-9-_]{0,160}$/i;
const BOT_UA_RE =
  /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|curl|python|wget|preview|facebookexternalhit|discordbot|telegrambot|whatsapp|embedly|quora|pinterest|vkshare|W3C_Validator|ia_archiver|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|perplexitybot/i;

const dedupCache = new Map<string, number>();

type RtdbSummaryNode = {
  totalReads?: number;
  updatedAt?: number;
};

type RtdbEntryTotalNode = {
  slug?: string;
  count?: number;
  lastAt?: number;
};

type RtdbTotalsTree = Partial<
  Record<ContentType, Record<string, RtdbEntryTotalNode>>
>;

type RtdbDailyBucket = {
  total?: number;
  byType?: Partial<Record<ContentType, number>>;
  byEntry?: Record<string, number>;
  byCountry?: Record<string, number>;
  bySource?: Record<string, number>;
};

export function isContentType(value: string): value is ContentType {
  return (CONTENT_TYPES as readonly string[]).includes(value);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug.trim());
}

export function toColomboDateKey(epochMs = Date.now()): string {
  return new Date(epochMs + COLOMBO_OFFSET_MS).toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const base = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(base)) return dateKey;
  return new Date(base + deltaDays * 86_400_000).toISOString().slice(0, 10);
}

function formatShortDayLabel(dateKey: string): string {
  const stamp = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(stamp)) return dateKey;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(stamp);
}

function getHmacSecret(): string {
  return (
    cleanEnvValue(process.env.ADMIN_SESSION_SECRET) ||
    cleanEnvValue(process.env.TURNSTILE_SECRET_KEY) ||
    "pm-web-v3-read-dedup-salt"
  );
}

function pruneDedupCache(nowMs: number) {
  if (dedupCache.size < MAX_DEDUP_KEYS) return;
  for (const [key, expiresAt] of dedupCache) {
    if (expiresAt <= nowMs) dedupCache.delete(key);
  }
  if (dedupCache.size >= MAX_DEDUP_KEYS) {
    const firstKey = dedupCache.keys().next().value;
    if (firstKey) dedupCache.delete(firstKey);
  }
}

function isDuplicateRead(
  ip: string,
  ua: string,
  type: ContentType,
  slug: string,
): boolean {
  const nowMs = Date.now();
  pruneDedupCache(nowMs);
  const bucket = Math.floor(nowMs / HALF_DAY_MS);
  const digest = createHmac("sha256", getHmacSecret())
    .update(`${bucket}|${ip}|${ua.slice(0, 160)}|${type}|${slug.toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);

  const expiresAt = dedupCache.get(digest);
  if (expiresAt && expiresAt > nowMs) {
    return true;
  }
  dedupCache.set(digest, (bucket + 1) * HALF_DAY_MS);
  return false;
}

function isPrefetchOrProbe(request: NextRequest): boolean {
  const purpose = (
    request.headers.get("purpose") ||
    request.headers.get("sec-purpose") ||
    ""
  ).toLowerCase();
  if (purpose.includes("prefetch") || purpose.includes("preview")) return true;
  if (request.headers.get("next-router-prefetch")) return true;
  if (request.headers.get("x-middleware-prefetch")) return true;

  const ua = (request.headers.get("user-agent") || "").trim();
  if (!ua || ua.length < 12) return true;
  if (BOT_UA_RE.test(ua)) return true;

  return false;
}

function resolveCountryCode(request: NextRequest): string {
  const raw = (
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    ""
  )
    .trim()
    .toUpperCase();
  if (/^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1") {
    return raw;
  }
  return "ZZ";
}

function resolveSourceLabel(
  request: NextRequest,
  clientReferrer?: string | null,
): string {
  const selfHost = (
    request.headers.get("x-forwarded-host")?.split(",")[0] ||
    request.headers.get("host") ||
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");

  const candidates = [clientReferrer, request.headers.get("referer")];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
      if (!host) continue;
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local")
      ) {
        return "direct";
      }
      if (selfHost && (host === selfHost || host.endsWith(`.${selfHost}`))) {
        return "direct";
      }
      if (host === "t.co" || host === "twitter.com") return "x.com";
      if (host.startsWith("google.")) return "google.com";
      if (host === "lnkd.in") return "linkedin.com";
      return host.slice(0, 64);
    } catch {
      // Ignore malformed referrer URLs.
    }
  }
  return "direct";
}

/**
 * Reads the current count for a single content entry. The public API response
 * applies the one-hour shared cache so the Firebase read happens on cache miss.
 * Returns `null` when Firebase readership storage is not configured.
 */
export async function getEntryReadCount(
  type: ContentType,
  slug: string,
): Promise<number | null> {
  if (!isFirebaseConfigured() || !isValidSlug(slug)) return null;
  const slugKey = encodeRtdbKey(slug.toLowerCase());
  const count = await rtdbGet<number>(
    `content_reads/totals/${type}/${slugKey}/count`,
    { revalidate: false },
  );
  if (typeof count === "number" && Number.isFinite(count)) {
    return Math.max(0, Math.floor(count));
  }
  return 0;
}

async function resolveCanonicalEntrySlug(
  type: ContentType,
  slug: string,
): Promise<string | null> {
  try {
    const index = await getContentIndex(type);
    if (!index.configured || index.error) {
      // Allow recording in uncached/partial dev setups if slug syntax is valid.
      return slug;
    }
    const target = slug.toLowerCase();
    const match = index.items.find(
      (item) => item.slug.toLowerCase() === target,
    );
    return match ? match.slug : null;
  } catch {
    return slug;
  }
}

export async function recordEntryRead(input: {
  request: NextRequest;
  type: ContentType;
  slug: string;
  referrer?: string | null;
}): Promise<{ configured: boolean; counted: boolean }> {
  if (!isFirebaseConfigured()) {
    return { configured: false, counted: false };
  }

  const canonicalSlug = await resolveCanonicalEntrySlug(input.type, input.slug);
  if (!canonicalSlug) {
    return { configured: true, counted: false };
  }

  // Skip bots, prefetches, and signed-in workspace owner visits without RTDB reads.
  if (isPrefetchOrProbe(input.request)) {
    return { configured: true, counted: false };
  }

  const adminSession = await getAdminSession(input.request);
  if (adminSession !== null) {
    return { configured: true, counted: false };
  }

  const ip = clientIp(input.request) || "unknown";
  const ua = input.request.headers.get("user-agent") || "";
  if (isDuplicateRead(ip, ua, input.type, canonicalSlug)) {
    return { configured: true, counted: false };
  }

  const nowMs = Date.now();
  const dayKey = toColomboDateKey(nowMs);
  const slugKey = encodeRtdbKey(canonicalSlug.toLowerCase());
  const countryCode = resolveCountryCode(input.request);
  const sourceKey = encodeRtdbKey(
    resolveSourceLabel(input.request, input.referrer),
  );
  const inc = { ".sv": { increment: 1 } };

  await rtdbPatch("content_reads", {
    "summary/totalReads": inc,
    "summary/updatedAt": nowMs,
    [`totals/${input.type}/${slugKey}/slug`]: canonicalSlug,
    [`totals/${input.type}/${slugKey}/count`]: inc,
    [`totals/${input.type}/${slugKey}/lastAt`]: nowMs,
    [`daily/${dayKey}/total`]: inc,
    [`daily/${dayKey}/byType/${input.type}`]: inc,
    [`daily/${dayKey}/byEntry/${input.type}__${slugKey}`]: inc,
    [`daily/${dayKey}/byCountry/${countryCode}`]: inc,
    [`daily/${dayKey}/bySource/${sourceKey}`]: inc,
  });

  return {
    configured: true,
    counted: true,
  };
}

function safeInt(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function formatCountryName(code: string): string {
  if (!code || code === "ZZ" || code === "XX") return "Unknown region";
  try {
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    return names.of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function formatSourceLabel(rawKey: string): string {
  const decoded = decodeRtdbKey(rawKey);
  if (!decoded || decoded === "direct") return "Direct / Workspace";
  return decoded;
}

function rangeDaysCount(range: InsightsRange): number | null {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "all":
      return null;
  }
}

function emptyInsightsReport(
  configured: boolean,
  range: InsightsRange,
  collection: InsightsCollectionFilter,
): InsightsReport {
  const today = toColomboDateKey();
  const days = rangeDaysCount(range) ?? 30;
  const series: InsightsDailyPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDaysToDateKey(today, -i);
    series.push({
      date,
      label: formatShortDayLabel(date),
      total: 0,
      byType: {},
    });
  }

  return {
    configured,
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Colombo",
    range,
    collection,
    kpis: {
      periodReads: 0,
      previousPeriodReads: range === "all" ? null : 0,
      deltaPercent: null,
      todayReads: 0,
      totalAllTime: 0,
      activeEntriesCount: 0,
      publishedEntriesCount: 0,
      topCollection: null,
    },
    series,
    topEntries: [],
    byCollection: CONTENT_TYPES.map((type) => ({
      type,
      label: CONTENT_META[type].label,
      publishedCount: 0,
      periodReads: 0,
      allTimeReads: 0,
      sharePercent: 0,
    })),
    topCountries: [],
    topSources: [],
  };
}

export async function getInsightsReport(options: {
  range: InsightsRange;
  collection: InsightsCollectionFilter;
}): Promise<InsightsReport> {
  const { range, collection } = options;
  if (!isFirebaseConfigured()) {
    return emptyInsightsReport(false, range, collection);
  }

  const today = toColomboDateKey();
  const days = rangeDaysCount(range);
  const currentStart = days ? addDaysToDateKey(today, -(days - 1)) : null;
  const fetchStart = days ? addDaysToDateKey(today, -(days * 2 - 1)) : null;

  const dailyQuery: Record<string, string> | undefined = fetchStart
    ? {
        orderBy: '"$key"',
        startAt: `"${fetchStart}"`,
        endAt: `"${today}"`,
      }
    : undefined;

  const [summary, totalsTree, dailyTree, cmsIndexes] = await Promise.all([
    rtdbGet<RtdbSummaryNode>("content_reads/summary", { revalidate: false }),
    rtdbGet<RtdbTotalsTree>("content_reads/totals", { revalidate: false }),
    rtdbGet<Record<string, RtdbDailyBucket>>("content_reads/daily", {
      query: dailyQuery,
      revalidate: false,
    }),
    Promise.all(CONTENT_TYPES.map((type) => getContentIndex(type))),
  ]);

  // Map published CMS entries for title/date enrichment.
  const entryMetaMap = new Map<
    string,
    {
      type: ContentType;
      slug: string;
      title: string;
      publishedDate: string | null;
    }
  >();
  const publishedByType: Record<ContentType, number> = {
    projects: 0,
    blog: 0,
    articles: 0,
    tutorials: 0,
    glossary: 0,
    news: 0,
  };

  for (let i = 0; i < CONTENT_TYPES.length; i += 1) {
    const type = CONTENT_TYPES[i];
    const items = cmsIndexes[i].items;
    publishedByType[type] = items.length;
    for (const item of items) {
      entryMetaMap.set(`${type}__${encodeRtdbKey(item.slug.toLowerCase())}`, {
        type,
        slug: item.slug,
        title: item.title,
        publishedDate: item.date,
      });
    }
  }

  // Aggregate all-time totals per collection and per entry.
  const allTimeByType: Record<ContentType, number> = {
    projects: 0,
    blog: 0,
    articles: 0,
    tutorials: 0,
    glossary: 0,
    news: 0,
  };
  const allTimeByEntry = new Map<
    string,
    {
      type: ContentType;
      slugKey: string;
      slug: string;
      count: number;
      lastAt: number | null;
    }
  >();

  for (const type of CONTENT_TYPES) {
    const bucket = totalsTree?.[type];
    if (!bucket || typeof bucket !== "object") continue;
    for (const [slugKey, node] of Object.entries(bucket)) {
      if (!node || typeof node !== "object") continue;
      const count = safeInt(node.count);
      const slug =
        typeof node.slug === "string" && node.slug
          ? node.slug
          : decodeRtdbKey(slugKey);
      allTimeByType[type] += count;
      allTimeByEntry.set(`${type}__${slugKey}`, {
        type,
        slugKey,
        slug,
        count,
        lastAt: typeof node.lastAt === "number" ? node.lastAt : null,
      });
    }
  }

  const dailyBuckets =
    dailyTree && typeof dailyTree === "object" ? dailyTree : {};
  const allDailyKeys = Object.keys(dailyBuckets)
    .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    .sort();

  const seriesStart =
    currentStart ??
    (allDailyKeys.length > 0
      ? allDailyKeys[0] < addDaysToDateKey(today, -29)
        ? allDailyKeys[0]
        : addDaysToDateKey(today, -29)
      : addDaysToDateKey(today, -29));

  // Build zero-filled daily series from `seriesStart` through `today`.
  const series: InsightsDailyPoint[] = [];
  let cursor = seriesStart;
  let guard = 0;
  while (cursor <= today && guard < 1500) {
    const bucket = dailyBuckets[cursor];
    const byType: Partial<Record<ContentType, number>> = {};
    let dayTotal = 0;

    if (bucket) {
      if (collection === "all") {
        for (const type of CONTENT_TYPES) {
          const c = safeInt(bucket.byType?.[type]);
          if (c > 0) byType[type] = c;
        }
        dayTotal = safeInt(bucket.total);
      } else {
        const c = safeInt(bucket.byType?.[collection]);
        if (c > 0) byType[collection] = c;
        dayTotal = c;
      }
    }

    series.push({
      date: cursor,
      label: formatShortDayLabel(cursor),
      total: dayTotal,
      byType,
    });
    cursor = addDaysToDateKey(cursor, 1);
    guard += 1;
  }

  // Aggregate period metrics, previous-period comparison, countries, and sources.
  const periodByType: Record<ContentType, number> = {
    projects: 0,
    blog: 0,
    articles: 0,
    tutorials: 0,
    glossary: 0,
    news: 0,
  };
  const periodByEntry = new Map<string, number>();
  const countryTotals = new Map<string, number>();
  const sourceTotals = new Map<string, number>();

  let periodReads = 0;
  let previousPeriodReads = 0;

  for (const [dateKey, bucket] of Object.entries(dailyBuckets)) {
    if (!bucket || typeof bucket !== "object") continue;
    const inCurrent = !currentStart || dateKey >= currentStart;
    const inPrevious =
      Boolean(currentStart && fetchStart) &&
      dateKey >= (fetchStart as string) &&
      dateKey < (currentStart as string);

    const dayRelevantReads =
      collection === "all"
        ? safeInt(bucket.total)
        : safeInt(bucket.byType?.[collection]);

    if (inPrevious) {
      previousPeriodReads += dayRelevantReads;
      continue;
    }
    if (!inCurrent) continue;

    periodReads += dayRelevantReads;

    for (const type of CONTENT_TYPES) {
      periodByType[type] += safeInt(bucket.byType?.[type]);
    }

    if (bucket.byEntry && typeof bucket.byEntry === "object") {
      for (const [compositeKey, rawVal] of Object.entries(bucket.byEntry)) {
        if (
          collection !== "all" &&
          !compositeKey.startsWith(`${collection}__`)
        ) {
          continue;
        }
        const val = safeInt(rawVal);
        if (val > 0) {
          periodByEntry.set(
            compositeKey,
            (periodByEntry.get(compositeKey) ?? 0) + val,
          );
        }
      }
    }

    // Country & source buckets are workspace-wide daily aggregates.
    if (bucket.byCountry && typeof bucket.byCountry === "object") {
      for (const [code, rawVal] of Object.entries(bucket.byCountry)) {
        const val = safeInt(rawVal);
        if (val > 0) {
          countryTotals.set(code, (countryTotals.get(code) ?? 0) + val);
        }
      }
    }

    if (bucket.bySource && typeof bucket.bySource === "object") {
      for (const [src, rawVal] of Object.entries(bucket.bySource)) {
        const val = safeInt(rawVal);
        if (val > 0) {
          const decoded = decodeRtdbKey(src).toLowerCase();
          const canonicalSrc =
            decoded === "localhost" ||
            decoded === "127.0.0.1" ||
            decoded.endsWith(".localhost") ||
            decoded.endsWith(".local")
              ? "direct"
              : src;
          sourceTotals.set(
            canonicalSrc,
            (sourceTotals.get(canonicalSrc) ?? 0) + val,
          );
        }
      }
    }
  }

  // If range === "all" and some historical reads predated daily buckets, fall back to totalsTree.
  const computedAllTimeTotal =
    collection === "all"
      ? Math.max(
          safeInt(summary?.totalReads),
          Object.values(allTimeByType).reduce((acc, n) => acc + n, 0),
        )
      : allTimeByType[collection];

  if (range === "all" && computedAllTimeTotal > periodReads) {
    periodReads = computedAllTimeTotal;
  }

  const todayBucket = dailyBuckets[today];
  const todayReads = todayBucket
    ? collection === "all"
      ? safeInt(todayBucket.total)
      : safeInt(todayBucket.byType?.[collection])
    : 0;

  const deltaPercent =
    range === "all" || previousPeriodReads === 0
      ? null
      : Math.round(
          ((periodReads - previousPeriodReads) / previousPeriodReads) * 100,
        );

  // Build collection rows.
  const totalAcrossCollectionsPeriod = Object.values(periodByType).reduce(
    (acc, n) => acc + n,
    0,
  );
  const byCollection: InsightsCollectionRow[] = CONTENT_TYPES.map((type) => {
    const pReads =
      range === "all"
        ? Math.max(periodByType[type], allTimeByType[type])
        : periodByType[type];
    const denom =
      range === "all"
        ? Math.max(
            1,
            Object.values(allTimeByType).reduce((a, b) => a + b, 0),
          )
        : Math.max(1, totalAcrossCollectionsPeriod);
    return {
      type,
      label: CONTENT_META[type].label,
      publishedCount: publishedByType[type],
      periodReads: pReads,
      allTimeReads: allTimeByType[type],
      sharePercent: pReads > 0 ? Math.round((pReads / denom) * 1000) / 10 : 0,
    };
  }).sort(
    (a, b) => b.periodReads - a.periodReads || b.allTimeReads - a.allTimeReads,
  );

  const topColCandidate = byCollection.find((c) => c.periodReads > 0) ?? null;

  // Build entry leaderboard combining period & all-time reads.
  const candidateKeys = new Set<string>([
    ...allTimeByEntry.keys(),
    ...periodByEntry.keys(),
  ]);

  const entryRows: InsightsEntryRow[] = [];
  for (const compositeKey of candidateKeys) {
    const sepIndex = compositeKey.indexOf("__");
    if (sepIndex <= 0) continue;
    const rawType = compositeKey.slice(0, sepIndex);
    const slugKey = compositeKey.slice(sepIndex + 2);
    if (!isContentType(rawType)) continue;
    if (collection !== "all" && rawType !== collection) continue;

    const allTimeNode = allTimeByEntry.get(compositeKey);
    const cmsMeta = entryMetaMap.get(compositeKey);
    const slug = cmsMeta?.slug || allTimeNode?.slug || decodeRtdbKey(slugKey);
    const allTimeCount = allTimeNode?.count ?? 0;
    const pCount =
      range === "all"
        ? Math.max(allTimeCount, periodByEntry.get(compositeKey) ?? 0)
        : (periodByEntry.get(compositeKey) ?? 0);

    if (pCount === 0 && allTimeCount === 0) continue;

    entryRows.push({
      type: rawType,
      slug,
      title: cmsMeta?.title || slug,
      collectionLabel: CONTENT_META[rawType].label,
      publishedDate: cmsMeta?.publishedDate ?? null,
      href: `/${rawType}/${encodeURIComponent(slug)}`,
      periodReads: pCount,
      allTimeReads: Math.max(allTimeCount, pCount),
      sharePercent:
        periodReads > 0 && pCount > 0
          ? Math.round((pCount / periodReads) * 1000) / 10
          : 0,
      lastReadAt: allTimeNode?.lastAt ?? null,
    });
  }

  entryRows.sort(
    (a, b) =>
      b.periodReads - a.periodReads ||
      b.allTimeReads - a.allTimeReads ||
      a.title.localeCompare(b.title),
  );

  const activeEntriesCount = entryRows.filter(
    (row) => row.periodReads > 0,
  ).length;
  const publishedEntriesCount =
    collection === "all"
      ? Object.values(publishedByType).reduce((acc, n) => acc + n, 0)
      : publishedByType[collection];

  const countryTotalSum = Array.from(countryTotals.values()).reduce(
    (acc, n) => acc + n,
    0,
  );
  const topCountries: InsightsBreakdownRow[] = Array.from(
    countryTotals.entries(),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, reads]) => ({
      key: code,
      label: formatCountryName(code),
      reads,
      sharePercent:
        countryTotalSum > 0
          ? Math.round((reads / countryTotalSum) * 1000) / 10
          : 0,
    }));

  const sourceTotalSum = Array.from(sourceTotals.values()).reduce(
    (acc, n) => acc + n,
    0,
  );
  const topSources: InsightsBreakdownRow[] = Array.from(sourceTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([srcKey, reads]) => ({
      key: decodeRtdbKey(srcKey),
      label: formatSourceLabel(srcKey),
      reads,
      sharePercent:
        sourceTotalSum > 0
          ? Math.round((reads / sourceTotalSum) * 1000) / 10
          : 0,
    }));

  return {
    configured: true,
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Colombo",
    range,
    collection,
    kpis: {
      periodReads,
      previousPeriodReads: range === "all" ? null : previousPeriodReads,
      deltaPercent,
      todayReads,
      totalAllTime: computedAllTimeTotal,
      activeEntriesCount,
      publishedEntriesCount,
      topCollection: topColCandidate
        ? {
            type: topColCandidate.type,
            label: topColCandidate.label,
            reads: topColCandidate.periodReads,
          }
        : null,
    },
    series,
    topEntries: entryRows.slice(0, 50),
    byCollection,
    topCountries,
    topSources,
  };
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildInsightsCsv(report: InsightsReport): string {
  const lines: string[] = [
    [
      "Rank",
      "Collection",
      "Title",
      "Slug",
      "Path",
      `Period Reads (${report.range})`,
      "All-Time Reads",
      "Period Share (%)",
      "Published Date",
      "Last Read (UTC)",
    ]
      .map(escapeCsvCell)
      .join(","),
  ];

  report.topEntries.forEach((entry, index) => {
    lines.push(
      [
        index + 1,
        entry.collectionLabel,
        entry.title,
        entry.slug,
        entry.href,
        entry.periodReads,
        entry.allTimeReads,
        entry.sharePercent,
        entry.publishedDate ?? "",
        entry.lastReadAt ? new Date(entry.lastReadAt).toISOString() : "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  });

  return lines.join("\r\n");
}
