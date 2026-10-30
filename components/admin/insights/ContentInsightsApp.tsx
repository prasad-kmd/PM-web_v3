"use client";

import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from "@animate-ui/react/primitives/tabs";
import { useShouldReduceMotion } from "@animate-ui/react/utils/motion";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  ChartBarLineIcon,
  ChartHistogramIcon,
  ChartLineData02Icon,
  Download04Icon,
  File02Icon,
  Globe02Icon,
  InformationCircleIcon,
  Layers01Icon,
  Link01Icon,
  RefreshIcon,
  Search01Icon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { toast } from "sonner";
import { LoadingView } from "@/components/system/states/LoadingView";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTENT_META,
  CONTENT_TYPES,
  type ContentType,
} from "@/lib/content-types";
import type {
  InsightsCollectionFilter,
  InsightsDailyPoint,
  InsightsEntryRow,
  InsightsRange,
  InsightsReport,
} from "@/lib/engagement/types";

type InsightsTab = "overview" | "entries" | "audience";
type ChartStyle = "area" | "bars";
type EntrySortMode = "period" | "allTime" | "recent";

const RANGE_OPTIONS: Array<{
  value: InsightsRange;
  shortLabel: string;
  longLabel: string;
}> = [
  { value: "7d", shortLabel: "7d", longLabel: "Last 7 days" },
  { value: "30d", shortLabel: "30d", longLabel: "Last 30 days" },
  { value: "90d", shortLabel: "90d", longLabel: "Last 90 days" },
  { value: "all", shortLabel: "All", longLabel: "All time" },
];

const COLLECTION_SELECT_ITEMS: Array<{
  value: InsightsCollectionFilter;
  label: string;
}> = [
  { value: "all", label: "All collections" },
  ...CONTENT_TYPES.map((type) => ({
    value: type,
    label: CONTENT_META[type].label,
  })),
];

const SORT_SELECT_ITEMS: Array<{ value: EntrySortMode; label: string }> = [
  { value: "period", label: "Most read in range" },
  { value: "allTime", label: "Most read all-time" },
  { value: "recent", label: "Most recently read" },
];

const numberFmt = new Intl.NumberFormat("en-US");
const decimalFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function formatCompactAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return String(value);
}

function formatFullDate(dateKey: string): string {
  const stamp = Date.parse(`${dateKey}T00:00:00Z`);
  if (!Number.isFinite(stamp)) return dateKey;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(stamp);
}

function formatRelativeStamp(epochMs: number | null): string {
  if (!epochMs || !Number.isFinite(epochMs)) return "—";
  const diff = Date.now() - epochMs;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(epochMs);
}

function DailyChartTooltip({
  active,
  payload,
}: Pick<TooltipContentProps, "active" | "payload">) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as InsightsDailyPoint | undefined;
  if (!point) return null;

  const breakdown = CONTENT_TYPES.flatMap((type) => {
    const count = point.byType?.[type] ?? 0;
    return count > 0 ? [{ type, label: CONTENT_META[type].label, count }] : [];
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="insights-tooltip">
      <div className="insights-tooltip-date">{formatFullDate(point.date)}</div>
      <div className="insights-tooltip-total">
        <strong>{numberFmt.format(point.total)}</strong>{" "}
        <span>{point.total === 1 ? "read" : "reads"}</span>
      </div>
      {breakdown.length > 0 ? (
        <div className="insights-tooltip-list">
          {breakdown.map((row) => (
            <div key={row.type} className="insights-tooltip-row">
              <span>{row.label}</span>
              <span className="tabular-nums">
                {numberFmt.format(row.count)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DailyReadershipChart({
  series,
  chartStyle,
  reduceMotion,
}: {
  series: InsightsDailyPoint[];
  chartStyle: ChartStyle;
  reduceMotion: boolean;
}) {
  const commonMargin = { top: 8, right: 8, bottom: 2, left: -14 };

  return (
    <div className="insights-chart-body">
      <div className="insights-chart-stage">
        <ResponsiveContainer width="100%" height={228}>
          {chartStyle === "area" ? (
            <AreaChart data={series} margin={commonMargin}>
              <defs>
                <linearGradient
                  id="insightsReadsGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--foreground)"
                    stopOpacity={0.18}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--foreground)"
                    stopOpacity={0.0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tickMargin={8}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={38}
                allowDecimals={false}
                domain={[
                  0,
                  (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.15)),
                ]}
                tickFormatter={formatCompactAxis}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{
                  stroke: "var(--border)",
                  strokeWidth: 1,
                }}
                content={(props) => <DailyChartTooltip {...props} />}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="var(--foreground)"
                strokeWidth={1.75}
                fill="url(#insightsReadsGradient)"
                isAnimationActive={!reduceMotion}
                animationDuration={280}
                activeDot={{
                  r: 4,
                  fill: "var(--foreground)",
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          ) : (
            <BarChart data={series} margin={commonMargin}>
              <CartesianGrid
                vertical={false}
                stroke="var(--border)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={28}
                tickMargin={8}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={38}
                allowDecimals={false}
                domain={[
                  0,
                  (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.15)),
                ]}
                tickFormatter={formatCompactAxis}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)", opacity: 0.6 }}
                content={(props) => <DailyChartTooltip {...props} />}
              />
              <Bar
                dataKey="total"
                fill="var(--foreground)"
                fillOpacity={0.82}
                radius={[4, 4, 0, 0]}
                maxBarSize={26}
                isAnimationActive={!reduceMotion}
                animationDuration={260}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ContentInsightsApp() {
  const router = useRouter();
  const shouldReduceMotion = useShouldReduceMotion();
  const scrollPaneRef = useRef<HTMLDivElement>(null);

  const [tab, setTab] = useState<InsightsTab>("overview");
  const [range, setRange] = useState<InsightsRange>("30d");
  const [collection, setCollection] = useState<InsightsCollectionFilter>("all");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("area");
  const [entrySort, setEntrySort] = useState<EntrySortMode>("period");
  const [entrySearch, setEntrySearch] = useState("");

  const [report, setReport] = useState<InsightsReport | null>(null);
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleTabChange = useCallback((nextValue: string) => {
    setTab(nextValue as InsightsTab);
    if (scrollPaneRef.current && scrollPaneRef.current.scrollTop > 0) {
      scrollPaneRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const loadReport = useCallback(
    async (
      targetRange: InsightsRange,
      targetCollection: InsightsCollectionFilter,
      isInitial = false,
    ) => {
      if (isInitial) setBooting(true);
      else setRefreshing(true);

      try {
        const params = new URLSearchParams({
          range: targetRange,
          type: targetCollection,
        });
        const res = await fetch(`/api/admin/insights?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as InsightsReport;
        setReport(data);
      } catch {
        toast.error("Could not load readership insights.");
      } finally {
        setBooting(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadReport(range, collection, report === null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, collection, loadReport]);

  const handleExportCsv = () => {
    const params = new URLSearchParams({
      range,
      type: collection,
      format: "csv",
    });
    window.open(
      `/api/admin/insights?${params.toString()}`,
      "_blank",
      "noopener",
    );
  };

  const seriesStats = useMemo(() => {
    const series = report?.series ?? [];
    if (!series.length) {
      return {
        avgPerDay: 0,
        activeDays: 0,
        totalDays: 0,
        peakPoint: null as InsightsDailyPoint | null,
      };
    }
    let sum = 0;
    let activeDays = 0;
    let peak: InsightsDailyPoint | null = null;
    for (const pt of series) {
      sum += pt.total;
      if (pt.total > 0) activeDays += 1;
      if (!peak || pt.total >= peak.total) peak = pt;
    }
    return {
      avgPerDay: sum / series.length,
      activeDays,
      totalDays: series.length,
      peakPoint: peak,
    };
  }, [report?.series]);

  const filteredEntries = useMemo<InsightsEntryRow[]>(() => {
    if (!report) return [];
    const q = entrySearch.trim().toLowerCase();
    const list = q
      ? report.topEntries.filter(
          (row) =>
            row.title.toLowerCase().includes(q) ||
            row.slug.toLowerCase().includes(q) ||
            row.collectionLabel.toLowerCase().includes(q),
        )
      : [...report.topEntries];

    list.sort((a, b) => {
      if (entrySort === "allTime") {
        return (
          b.allTimeReads - a.allTimeReads ||
          b.periodReads - a.periodReads ||
          a.title.localeCompare(b.title)
        );
      }
      if (entrySort === "recent") {
        return (
          (b.lastReadAt ?? 0) - (a.lastReadAt ?? 0) ||
          b.periodReads - a.periodReads
        );
      }
      return (
        b.periodReads - a.periodReads ||
        b.allTimeReads - a.allTimeReads ||
        a.title.localeCompare(b.title)
      );
    });

    return list;
  }, [entrySearch, entrySort, report]);

  const audienceSummary = useMemo(() => {
    if (!report) return { directReads: 0, externalReads: 0, directShare: 0 };
    let directReads = 0;
    let externalReads = 0;
    for (const src of report.topSources) {
      if (src.key === "direct") directReads += src.reads;
      else externalReads += src.reads;
    }
    const total = directReads + externalReads;
    return {
      directReads,
      externalReads,
      directShare: total > 0 ? Math.round((directReads / total) * 100) : 0,
    };
  }, [report]);

  if (booting && !report) {
    return <LoadingView label="Content Insights" layout="insights" />;
  }

  const kpis = report?.kpis;
  const delta = kpis?.deltaPercent ?? null;
  const rangeMeta =
    RANGE_OPTIONS.find((opt) => opt.value === range) ?? RANGE_OPTIONS[1];
  const reachPercent =
    kpis && kpis.publishedEntriesCount > 0
      ? Math.round((kpis.activeEntriesCount / kpis.publishedEntriesCount) * 100)
      : 0;

  const sectionTabs = [
    {
      id: "overview",
      label: "Overview",
      icon: ChartLineData02Icon,
    },
    {
      id: "entries",
      label: report?.configured
        ? `Entries (${report.topEntries.length})`
        : "Entries",
      icon: File02Icon,
    },
    {
      id: "audience",
      label: "Audience",
      icon: Globe02Icon,
    },
  ] as const;

  return (
    <Tabs
      value={tab}
      onValueChange={handleTabChange}
      className="admin-studio-shell insights-studio-shell"
    >
      {/* 42px Studio Sub-Toolbar with Animate UI Gliding Tab Highlights */}
      <header className="admin-studio-toolbar">
        <div className="admin-studio-toolbar-left">
          <TabsHighlight className="insights-tab-pill">
            <TabsList
              aria-label="Content insights sections"
              className="admin-segmented-tabs"
            >
              {sectionTabs.map((item) => (
                <TabsHighlightItem key={item.id} value={item.id}>
                  <TabsTrigger
                    value={item.id}
                    className="admin-segmented-tab is-animated"
                  >
                    <HugeiconsIcon
                      icon={item.icon}
                      strokeWidth={2}
                      size={13}
                      aria-hidden
                    />
                    <span>{item.label}</span>
                  </TabsTrigger>
                </TabsHighlightItem>
              ))}
            </TabsList>
          </TabsHighlight>
        </div>

        <div className="admin-studio-toolbar-right">
          <Tabs
            value={range}
            onValueChange={(next) => setRange(next as InsightsRange)}
          >
            <TabsHighlight className="insights-tab-pill">
              <TabsList
                aria-label="Date range"
                className="admin-segmented-tabs"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <TabsHighlightItem key={opt.value} value={opt.value}>
                    <TabsTrigger
                      value={opt.value}
                      className="admin-segmented-tab is-animated"
                    >
                      {opt.shortLabel}
                    </TabsTrigger>
                  </TabsHighlightItem>
                ))}
              </TabsList>
            </TabsHighlight>
          </Tabs>

          <span
            className={`invoice-sync-pill${report?.configured ? " is-cloud" : ""}`}
          >
            <span className="invoice-sync-dot" aria-hidden />
            <span>{report?.configured ? "Active" : "Inactive"}</span>
          </span>

          <Button
            type="button"
            size="xs"
            variant="ghost"
            aria-label="Refresh insights"
            disabled={refreshing}
            onClick={() => void loadReport(range, collection, false)}
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              strokeWidth={2}
              size={13}
              className={refreshing ? "animate-spin" : undefined}
              aria-hidden
            />
          </Button>

          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={!report?.configured || !report.topEntries.length}
            onClick={handleExportCsv}
          >
            <HugeiconsIcon
              icon={Download04Icon}
              strokeWidth={2}
              size={13}
              aria-hidden
            />
            <span>CSV</span>
          </Button>
        </div>
      </header>

      {refreshing ? (
        <div className="state-bar" aria-hidden>
          <span />
        </div>
      ) : null}

      {/* Scrollable Studio Viewport */}
      <div ref={scrollPaneRef} className="insights-pane-scroll">
        {!report?.configured ? (
          <section className="insights-setup-state" role="status">
            <div className="insights-setup-glyph" aria-hidden>
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={20}
                strokeWidth={1.9}
              />
            </div>
            <h2>Readership counter is not active</h2>
            <p>
              Public content reader pages hide the read count until readership
              storage is enabled for this deployment. Once configured,
              deduplicated opens across all six collections appear here
              automatically without third-party browser scripts.
            </p>
            <div className="insights-setup-meta">
              <span>Reference:</span>
              <code>docs/engagement-and-insights.md</code>
            </div>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => void loadReport(range, collection, false)}
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} size={13} />
              <span>Check status</span>
            </Button>
          </section>
        ) : (
          <TabsContents className="insights-tabs-contents">
            {/* Tab 1: Overview */}
            <TabsContent value="overview" className="insights-tab-panel">
              <div className="insights-tab-stack">
                {kpis ? (
                  <div className="insights-kpi-grid tabular-nums">
                    <div className="insights-kpi-card">
                      <div className="insights-kpi-top">
                        <span className="insights-kpi-label">
                          {range === "all"
                            ? "Total reads"
                            : rangeMeta.longLabel}
                        </span>
                        <HugeiconsIcon
                          icon={ViewIcon}
                          size={14}
                          strokeWidth={1.8}
                          className="insights-kpi-icon"
                          aria-hidden
                        />
                      </div>
                      <div className="insights-kpi-main">
                        <strong className="insights-kpi-value">
                          {numberFmt.format(kpis.periodReads)}
                        </strong>
                        {delta !== null ? (
                          <span
                            className={`insights-delta-pill${delta > 0 ? " is-up" : delta < 0 ? " is-down" : ""}`}
                          >
                            {delta !== 0 ? (
                              <HugeiconsIcon
                                icon={
                                  delta > 0 ? ArrowUp01Icon : ArrowDown01Icon
                                }
                                size={10.5}
                                strokeWidth={2.2}
                                aria-hidden
                              />
                            ) : null}
                            {delta > 0 ? `+${delta}%` : `${delta}%`}
                          </span>
                        ) : null}
                      </div>
                      <small className="insights-kpi-sub">
                        {kpis.previousPeriodReads !== null
                          ? `vs ${numberFmt.format(kpis.previousPeriodReads)} prior period`
                          : "All recorded readership"}
                      </small>
                    </div>

                    <div className="insights-kpi-card">
                      <div className="insights-kpi-top">
                        <span className="insights-kpi-label">Today</span>
                        <HugeiconsIcon
                          icon={Calendar03Icon}
                          size={14}
                          strokeWidth={1.8}
                          className="insights-kpi-icon"
                          aria-hidden
                        />
                      </div>
                      <div className="insights-kpi-main">
                        <strong className="insights-kpi-value">
                          {numberFmt.format(kpis.todayReads)}
                        </strong>
                      </div>
                      <small className="insights-kpi-sub">
                        {seriesStats.peakPoint &&
                        seriesStats.peakPoint.total > 0
                          ? `Peak ${numberFmt.format(seriesStats.peakPoint.total)} on ${seriesStats.peakPoint.label}`
                          : "No peak day recorded in range"}
                      </small>
                    </div>

                    <div className="insights-kpi-card">
                      <div className="insights-kpi-top">
                        <span className="insights-kpi-label">
                          Daily average
                        </span>
                        <HugeiconsIcon
                          icon={ChartBarLineIcon}
                          size={14}
                          strokeWidth={1.8}
                          className="insights-kpi-icon"
                          aria-hidden
                        />
                      </div>
                      <div className="insights-kpi-main">
                        <strong className="insights-kpi-value">
                          {decimalFmt.format(seriesStats.avgPerDay)}
                        </strong>
                      </div>
                      <small className="insights-kpi-sub">
                        {seriesStats.activeDays} of {seriesStats.totalDays}{" "}
                        active {seriesStats.totalDays === 1 ? "day" : "days"}
                      </small>
                    </div>

                    <div className="insights-kpi-card">
                      <div className="insights-kpi-top">
                        <span className="insights-kpi-label">
                          Catalog reach
                        </span>
                        <HugeiconsIcon
                          icon={Layers01Icon}
                          size={14}
                          strokeWidth={1.8}
                          className="insights-kpi-icon"
                          aria-hidden
                        />
                      </div>
                      <div className="insights-kpi-main">
                        <strong className="insights-kpi-value">
                          {numberFmt.format(kpis.activeEntriesCount)}
                          <span className="insights-kpi-denom">
                            /{numberFmt.format(kpis.publishedEntriesCount)}
                          </span>
                        </strong>
                        {kpis.publishedEntriesCount > 0 ? (
                          <span className="insights-delta-pill">
                            {reachPercent}%
                          </span>
                        ) : null}
                      </div>
                      <small className="insights-kpi-sub">
                        {numberFmt.format(kpis.totalAllTime)} cumulative
                        all-time reads
                      </small>
                    </div>
                  </div>
                ) : null}

                {/* Main Recharts Readership Trend Card */}
                <section className="invoice-section-card insights-card">
                  <div className="invoice-section-head insights-card-head">
                    <div>
                      <h3>Readership trend</h3>
                      <p>
                        Deduplicated public content opens by calendar day
                        (Asia/Colombo)
                      </p>
                    </div>

                    <div className="insights-card-controls">
                      <Select
                        items={COLLECTION_SELECT_ITEMS}
                        value={collection}
                        onValueChange={(val) => {
                          if (val)
                            setCollection(val as InsightsCollectionFilter);
                        }}
                      >
                        <SelectTrigger
                          className="h-7 min-w-36"
                          aria-label="Filter collection"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          {COLLECTION_SELECT_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectPopup>
                      </Select>

                      <Tabs
                        value={chartStyle}
                        onValueChange={(next) =>
                          setChartStyle(next as ChartStyle)
                        }
                      >
                        <TabsHighlight className="insights-tab-pill">
                          <TabsList
                            aria-label="Chart display style"
                            className="admin-segmented-tabs"
                          >
                            <TabsHighlightItem value="area">
                              <TabsTrigger
                                value="area"
                                className="admin-segmented-tab is-animated"
                              >
                                <HugeiconsIcon
                                  icon={ChartLineData02Icon}
                                  strokeWidth={2}
                                  size={12.5}
                                  aria-hidden
                                />
                                <span>Area</span>
                              </TabsTrigger>
                            </TabsHighlightItem>
                            <TabsHighlightItem value="bars">
                              <TabsTrigger
                                value="bars"
                                className="admin-segmented-tab is-animated"
                              >
                                <HugeiconsIcon
                                  icon={ChartHistogramIcon}
                                  strokeWidth={2}
                                  size={12.5}
                                  aria-hidden
                                />
                                <span>Bars</span>
                              </TabsTrigger>
                            </TabsHighlightItem>
                          </TabsList>
                        </TabsHighlight>
                      </Tabs>
                    </div>
                  </div>

                  <DailyReadershipChart
                    series={report.series}
                    chartStyle={chartStyle}
                    reduceMotion={Boolean(shouldReduceMotion)}
                  />
                </section>

                {/* Bottom Two-Column Overview Split */}
                <div className="insights-overview-split">
                  <section className="invoice-section-card insights-card">
                    <div className="invoice-section-head">
                      <div>
                        <h3>Collections</h3>
                        <p>Share of reads across published collections</p>
                      </div>
                      {collection !== "all" ? (
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setCollection("all")}
                        >
                          Show all
                        </Button>
                      ) : null}
                    </div>

                    <div className="insights-col-list tabular-nums">
                      {report.byCollection.map((col) => {
                        const isSelected = collection === col.type;
                        return (
                          <button
                            key={col.type}
                            type="button"
                            className={`insights-col-row${isSelected ? " is-selected" : ""}`}
                            onClick={() =>
                              setCollection(isSelected ? "all" : col.type)
                            }
                          >
                            <div className="insights-col-row-top">
                              <span className="insights-col-name">
                                {col.label}
                                <small>{col.publishedCount} published</small>
                              </span>
                              <span className="insights-col-figures">
                                <strong>
                                  {numberFmt.format(col.periodReads)}
                                </strong>
                                <small>{col.sharePercent}%</small>
                              </span>
                            </div>
                            <div className="insights-meter-track" aria-hidden>
                              <span
                                className="insights-meter-fill"
                                style={{
                                  width: `${
                                    col.periodReads > 0
                                      ? Math.min(
                                          100,
                                          Math.max(2, col.sharePercent),
                                        )
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="invoice-section-card insights-card">
                    <div className="invoice-section-head">
                      <div>
                        <h3>Top entries</h3>
                        <p>
                          Most read content in{" "}
                          {rangeMeta.longLabel.toLowerCase()}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => handleTabChange("entries")}
                      >
                        <span>All entries</span>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          strokeWidth={2}
                          size={12}
                          aria-hidden
                        />
                      </Button>
                    </div>

                    {report.topEntries.length === 0 ? (
                      <div className="insights-empty-box">
                        No public content reads recorded for this selection yet.
                      </div>
                    ) : (
                      <div className="insights-top-preview tabular-nums">
                        {report.topEntries.slice(0, 6).map((entry, idx) => (
                          <button
                            key={`${entry.type}:${entry.slug}`}
                            type="button"
                            className="insights-preview-row"
                            onClick={() =>
                              router.push(entry.href, { scroll: false })
                            }
                          >
                            <span className="insights-preview-rank">
                              {idx + 1}
                            </span>
                            <span className="insights-preview-copy">
                              <strong className="insights-preview-title">
                                {entry.title}
                              </strong>
                              <small>{entry.collectionLabel}</small>
                            </span>
                            <span className="insights-preview-count">
                              <strong>
                                {numberFmt.format(entry.periodReads)}
                              </strong>
                              <small>
                                {entry.periodReads === 1 ? "read" : "reads"}
                              </small>
                            </span>
                            <HugeiconsIcon
                              icon={ArrowUpRight01Icon}
                              size={13}
                              strokeWidth={1.9}
                              className="text-muted-foreground"
                              aria-hidden
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Full Filterable & Sortable Content Leaderboard */}
            <TabsContent value="entries" className="insights-tab-panel">
              <div className="insights-tab-stack">
                <div className="invoice-filter-bar">
                  <div className="admin-chip-wrap">
                    <button
                      type="button"
                      onClick={() => setCollection("all")}
                      className={`admin-chip-btn${collection === "all" ? " is-active" : ""}`}
                    >
                      All
                    </button>
                    {CONTENT_TYPES.map((type: ContentType) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCollection(type)}
                        className={`admin-chip-btn${collection === type ? " is-active" : ""}`}
                      >
                        {CONTENT_META[type].label}
                      </button>
                    ))}
                  </div>

                  <div className="invoice-filter-controls">
                    <Select
                      items={SORT_SELECT_ITEMS}
                      value={entrySort}
                      onValueChange={(val) => {
                        if (val) setEntrySort(val as EntrySortMode);
                      }}
                    >
                      <SelectTrigger
                        className="h-8 min-w-40"
                        aria-label="Sort entries"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {SORT_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>

                    <div className="invoice-search-box">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        strokeWidth={2}
                        size={14}
                      />
                      <input
                        type="search"
                        value={entrySearch}
                        onChange={(e) => setEntrySearch(e.target.value)}
                        placeholder="Search title or slug…"
                        aria-label="Filter entries"
                      />
                    </div>
                  </div>
                </div>

                <section className="invoice-section-card insights-card">
                  {filteredEntries.length === 0 ? (
                    <div className="insights-empty-box">
                      {entrySearch.trim()
                        ? `No entries match “${entrySearch.trim()}”.`
                        : "No public content reads recorded for this filter yet."}
                    </div>
                  ) : (
                    <div className="invoice-table-wrap">
                      <table className="invoice-ledger-table insights-ledger-table tabular-nums">
                        <thead>
                          <tr>
                            <th className="w-10">#</th>
                            <th>Entry</th>
                            <th>Collection</th>
                            <th className="w-36">Share</th>
                            <th className="text-right">In range</th>
                            <th className="text-right">All-time</th>
                            <th className="text-right">Last read</th>
                            <th className="w-10 text-right" aria-label="Open" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEntries.map((entry, idx) => (
                            <tr
                              key={`${entry.type}:${entry.slug}`}
                              className="insights-table-row"
                              onClick={() =>
                                router.push(entry.href, { scroll: false })
                              }
                            >
                              <td className="text-muted-foreground">
                                {idx + 1}
                              </td>
                              <td>
                                <div className="insights-entry-main">
                                  <span className="insights-entry-title">
                                    {entry.title}
                                  </span>
                                  <span className="insights-entry-slug">
                                    /{entry.type}/{entry.slug}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span className="insights-entry-badge">
                                  {entry.collectionLabel}
                                </span>
                              </td>
                              <td>
                                <div className="insights-share-cell">
                                  <div
                                    className="insights-meter-track"
                                    aria-hidden
                                  >
                                    <span
                                      className="insights-meter-fill"
                                      style={{
                                        width: `${
                                          entry.periodReads > 0
                                            ? Math.min(
                                                100,
                                                Math.max(3, entry.sharePercent),
                                              )
                                            : 0
                                        }%`,
                                      }}
                                    />
                                  </div>
                                  <span>{entry.sharePercent}%</span>
                                </div>
                              </td>
                              <td className="text-right font-semibold">
                                {numberFmt.format(entry.periodReads)}
                              </td>
                              <td className="text-right text-muted-foreground">
                                {numberFmt.format(entry.allTimeReads)}
                              </td>
                              <td className="text-right text-muted-foreground">
                                {formatRelativeStamp(entry.lastReadAt)}
                              </td>
                              <td className="text-right">
                                <HugeiconsIcon
                                  icon={ArrowUpRight01Icon}
                                  size={13.5}
                                  strokeWidth={1.9}
                                  className="inline-block text-muted-foreground"
                                  aria-hidden
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </TabsContent>

            {/* Tab 3: Audience (Sources & Regions) */}
            <TabsContent value="audience" className="insights-tab-panel">
              <div className="insights-tab-stack">
                <div className="insights-audience-summary tabular-nums">
                  <div className="insights-kpi-card">
                    <div className="insights-kpi-top">
                      <span className="insights-kpi-label">
                        Direct & workspace
                      </span>
                      <HugeiconsIcon
                        icon={Layers01Icon}
                        size={14}
                        strokeWidth={1.8}
                        className="insights-kpi-icon"
                        aria-hidden
                      />
                    </div>
                    <div className="insights-kpi-main">
                      <strong className="insights-kpi-value">
                        {numberFmt.format(audienceSummary.directReads)}
                      </strong>
                      <span className="insights-delta-pill">
                        {audienceSummary.directShare}%
                      </span>
                    </div>
                    <small className="insights-kpi-sub">
                      Opened directly or from workspace windows
                    </small>
                  </div>

                  <div className="insights-kpi-card">
                    <div className="insights-kpi-top">
                      <span className="insights-kpi-label">
                        External referrers
                      </span>
                      <HugeiconsIcon
                        icon={Link01Icon}
                        size={14}
                        strokeWidth={1.8}
                        className="insights-kpi-icon"
                        aria-hidden
                      />
                    </div>
                    <div className="insights-kpi-main">
                      <strong className="insights-kpi-value">
                        {numberFmt.format(audienceSummary.externalReads)}
                      </strong>
                      <span className="insights-delta-pill">
                        {audienceSummary.directReads +
                          audienceSummary.externalReads >
                        0
                          ? `${100 - audienceSummary.directShare}%`
                          : "0%"}
                      </span>
                    </div>
                    <small className="insights-kpi-sub">
                      Search engines, social links, and external sites
                    </small>
                  </div>

                  <div className="insights-kpi-card">
                    <div className="insights-kpi-top">
                      <span className="insights-kpi-label">Active regions</span>
                      <HugeiconsIcon
                        icon={Globe02Icon}
                        size={14}
                        strokeWidth={1.8}
                        className="insights-kpi-icon"
                        aria-hidden
                      />
                    </div>
                    <div className="insights-kpi-main">
                      <strong className="insights-kpi-value">
                        {numberFmt.format(report.topCountries.length)}
                      </strong>
                    </div>
                    <small className="insights-kpi-sub">
                      {report.topCountries[0]
                        ? `Leading: ${report.topCountries[0].label} (${report.topCountries[0].sharePercent}%)`
                        : "No regional data in range"}
                    </small>
                  </div>
                </div>

                <div className="insights-overview-split">
                  <section className="invoice-section-card insights-card">
                    <div className="invoice-section-head">
                      <div>
                        <h3>Referrer sources</h3>
                        <p>Hostname-level origin of reader sessions</p>
                      </div>
                    </div>

                    {report.topSources.length === 0 ? (
                      <div className="insights-empty-box">
                        No referrer data recorded in{" "}
                        {rangeMeta.longLabel.toLowerCase()}.
                      </div>
                    ) : (
                      <ul className="insights-breakdown-list tabular-nums">
                        {report.topSources.map((row) => (
                          <li key={row.key} className="insights-breakdown-row">
                            <div className="insights-breakdown-head">
                              <span className="insights-breakdown-label">
                                {row.label}
                              </span>
                              <span className="insights-breakdown-figures">
                                <strong>{numberFmt.format(row.reads)}</strong>
                                <small>{row.sharePercent}%</small>
                              </span>
                            </div>
                            <div className="insights-meter-track" aria-hidden>
                              <span
                                className="insights-meter-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(2, row.sharePercent))}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section className="invoice-section-card insights-card">
                    <div className="invoice-section-head">
                      <div>
                        <h3>Reader regions</h3>
                        <p>
                          Country-level distribution in{" "}
                          {rangeMeta.longLabel.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {report.topCountries.length === 0 ? (
                      <div className="insights-empty-box">
                        No regional data recorded in{" "}
                        {rangeMeta.longLabel.toLowerCase()}.
                      </div>
                    ) : (
                      <ul className="insights-breakdown-list tabular-nums">
                        {report.topCountries.map((row) => (
                          <li key={row.key} className="insights-breakdown-row">
                            <div className="insights-breakdown-head">
                              <span className="insights-breakdown-label">
                                <code className="insights-iso-code">
                                  {row.key === "ZZ" ? "—" : row.key}
                                </code>
                                <span>{row.label}</span>
                              </span>
                              <span className="insights-breakdown-figures">
                                <strong>{numberFmt.format(row.reads)}</strong>
                                <small>{row.sharePercent}%</small>
                              </span>
                            </div>
                            <div className="insights-meter-track" aria-hidden>
                              <span
                                className="insights-meter-fill"
                                style={{
                                  width: `${Math.min(100, Math.max(2, row.sharePercent))}%`,
                                }}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                <p className="insights-privacy-note">
                  Counts are aggregated into daily local-date buckets without
                  storing visitor IP addresses, browser fingerprints, or
                  third-party tracking cookies.
                </p>
              </div>
            </TabsContent>
          </TabsContents>
        )}
      </div>
    </Tabs>
  );
}
