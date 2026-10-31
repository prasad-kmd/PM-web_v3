import type { ContentType } from "@/lib/content-types";

export type InsightsRange = "7d" | "30d" | "90d" | "all";
export type InsightsCollectionFilter = "all" | ContentType;

export type ReadCountResponse = {
  configured: boolean;
  count: number | null;
};

export type PulseResponse = {
  configured: boolean;
  counted: boolean;
};

export type InsightsDailyPoint = {
  date: string;
  label: string;
  total: number;
  byType: Partial<Record<ContentType, number>>;
};

export type InsightsEntryRow = {
  type: ContentType;
  slug: string;
  title: string;
  collectionLabel: string;
  publishedDate: string | null;
  href: string;
  periodReads: number;
  allTimeReads: number;
  sharePercent: number;
  lastReadAt: number | null;
};

export type InsightsCollectionRow = {
  type: ContentType;
  label: string;
  publishedCount: number;
  periodReads: number;
  allTimeReads: number;
  sharePercent: number;
};

export type InsightsBreakdownRow = {
  key: string;
  label: string;
  reads: number;
  sharePercent: number;
};

export type InsightsKpis = {
  periodReads: number;
  previousPeriodReads: number | null;
  deltaPercent: number | null;
  todayReads: number;
  totalAllTime: number;
  activeEntriesCount: number;
  publishedEntriesCount: number;
  topCollection: {
    type: ContentType;
    label: string;
    reads: number;
  } | null;
};

export type InsightsReport = {
  configured: boolean;
  generatedAt: string;
  timezone: "Asia/Colombo";
  range: InsightsRange;
  collection: InsightsCollectionFilter;
  kpis: InsightsKpis;
  series: InsightsDailyPoint[];
  topEntries: InsightsEntryRow[];
  byCollection: InsightsCollectionRow[];
  topCountries: InsightsBreakdownRow[];
  topSources: InsightsBreakdownRow[];
};
