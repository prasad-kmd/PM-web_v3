"use client";

import {
  ArrowUpRight01Icon,
  Copy01Icon,
  Delete02Icon,
  Download04Icon,
  GridViewIcon,
  Image02Icon,
  Layers01Icon,
  PaintBoardIcon,
  RefreshIcon,
  SparklesIcon,
  TextFontIcon,
  Tick02Icon,
  Upload04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  buildOgCustomQuery,
  CANVAS_PRESETS,
  DEFAULT_OG_CUSTOM_CONFIG,
  OG_ACCENTS,
  OG_BACKDROPS,
  OG_ICONS,
  OG_LAYOUTS,
  OG_PATTERNS,
  type OgAccentId,
  type OgBackdropId,
  type OgCanvasPreset,
  type OgCustomConfig,
  type OgIconId,
  type OgLayoutId,
  type OgPatternId,
} from "@/lib/og/custom-schema";

type InspectorTab = "content" | "bloom" | "layout" | "media";
type StageMode = "canvas" | "social";

const QUICK_CATEGORIES = [
  "Mechatronics",
  "Projects",
  "Articles",
  "Tutorials",
  "Systems",
  "Release",
];

const ICON_SELECT_ITEMS = (Object.keys(OG_ICONS) as OgIconId[]).map((key) => ({
  value: key,
  label: OG_ICONS[key],
}));

const CARD_TONE_SELECT_ITEMS = [
  { value: "dark", label: "Dark Acrylic" },
  { value: "light", label: "Light Paper" },
];

const VIGNETTE_SELECT_ITEMS = [
  { value: "subtle", label: "Subtle" },
  { value: "medium", label: "Balanced" },
  { value: "deep", label: "Deep Focus" },
];

const TITLE_SIZE_SELECT_ITEMS = [
  { value: "auto", label: "Auto-fit" },
  { value: "sm", label: "Compact (42px)" },
  { value: "md", label: "Balanced (52px)" },
  { value: "lg", label: "Headline (62px)" },
  { value: "xl", label: "Display (72px)" },
];

const DESC_SIZE_SELECT_ITEMS = [
  { value: "sm", label: "Compact (19px)" },
  { value: "md", label: "Standard (22px)" },
  { value: "lg", label: "Lead (26px)" },
];

const STUDIO_TEMPLATES: Array<{
  id: string;
  label: string;
  patch: Partial<OgCustomConfig>;
}> = [
  {
    id: "case-study",
    label: "Case Study",
    patch: {
      layout: "spotlight",
      backdrop: "bloom-blue",
      accent: "sky",
      pattern: "crosshair",
      cardTone: "dark",
      category: "Mechatronics",
      kicker: "Engineering Case Study",
      icon: "cpu",
      align: "left",
    },
  },
  {
    id: "editorial-article",
    label: "Editorial Essay",
    patch: {
      layout: "editorial",
      backdrop: "bloom-coral",
      accent: "amber",
      pattern: "grid",
      cardTone: "dark",
      category: "Articles",
      kicker: "Field Notes",
      icon: "pm",
      align: "left",
    },
  },
  {
    id: "software-release",
    label: "Release Note",
    patch: {
      layout: "split",
      backdrop: "bloom-teal",
      accent: "emerald",
      pattern: "dots",
      cardTone: "dark",
      category: "Release",
      kicker: "v3.2 Workspace",
      icon: "terminal",
      align: "left",
    },
  },
  {
    id: "daylight-sheet",
    label: "Daylight Spec",
    patch: {
      layout: "spotlight",
      backdrop: "daylight",
      accent: "blue",
      pattern: "grid",
      cardTone: "light",
      category: "Architecture",
      kicker: "Technical Brief",
      icon: "compass",
      align: "left",
    },
  },
];

function slugifyFilename(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "og-card";
}

async function compressImageFileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unsupported image format."));
      img.onload = () => {
        const maxSide = 1200;
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          const ratio = Math.min(maxSide / width, maxSide / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const outMime = file.type === "image/png" ? "image/png" : "image/jpeg";
        resolve(canvas.toDataURL(outMime, 0.88));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function OgStudioApp() {
  const [config, setConfig] = useState<OgCustomConfig>(
    DEFAULT_OG_CUSTOM_CONFIG,
  );
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("content");
  const [stageMode, setStageMode] = useState<StageMode>("canvas");
  const [autoRender, setAutoRender] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedImage, setCopiedImage] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [lastBlob, setLastBlob] = useState<Blob | null>(null);
  const [renderMeta, setRenderMeta] = useState<{
    bytes: number;
    ms: number;
  } | null>(null);
  const [localFileName, setLocalFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const update = useCallback(
    <K extends keyof OgCustomConfig>(key: K, value: OgCustomConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const dimensions = CANVAS_PRESETS[config.preset];
  const activeBackdrop = OG_BACKDROPS[config.backdrop];

  const getShareEndpointUrl = useCallback(
    (cfg: OgCustomConfig) => `/api/og-custom?${buildOgCustomQuery(cfg)}`,
    [],
  );

  const renderCard = useCallback(async (snapshot: OgCustomConfig) => {
    if (!snapshot.title.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRendering(true);
    const t0 = performance.now();

    try {
      const usePost = Boolean(snapshot.imageDataUri);
      const res = usePost
        ? await fetch("/api/og-custom", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(snapshot),
            signal: controller.signal,
          })
        : await fetch(`/api/og-custom?${buildOgCustomQuery(snapshot)}`, {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          });

      if (!res.ok) {
        throw new Error(`Render failed (${res.status})`);
      }
      const blob = await res.blob();
      const nextUrl = URL.createObjectURL(blob);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = nextUrl;
      setPreviewBlobUrl(nextUrl);
      setLastBlob(blob);
      setRenderMeta({
        bytes: blob.size,
        ms: Math.round(performance.now() - t0),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      toast.error("Could not render image preview.");
    } finally {
      if (abortRef.current === controller) {
        setRendering(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!autoRender) return;
    const timer = window.setTimeout(() => {
      void renderCard(config);
    }, 340);
    return () => window.clearTimeout(timer);
  }, [autoRender, config, renderCard]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
    };
  }, []);

  async function handleDownloadPng() {
    setDownloading(true);
    try {
      let blob = lastBlob;
      if (!blob || !autoRender) {
        const usePost = Boolean(config.imageDataUri);
        const res = usePost
          ? await fetch("/api/og-custom", {
              method: "POST",
              credentials: "same-origin",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(config),
            })
          : await fetch(getShareEndpointUrl(config), {
              credentials: "same-origin",
              cache: "no-store",
            });
        if (!res.ok) throw new Error("Render failed");
        blob = await res.blob();
      }
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `og-${slugifyFilename(config.title)}-${dimensions.width}x${dimensions.height}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(dlUrl), 1500);
      toast.success("PNG downloaded.");
    } catch {
      toast.error("Could not export PNG.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopyPng() {
    try {
      if (!lastBlob || typeof ClipboardItem === "undefined") {
        toast.error("Clipboard image copy is not supported in this browser.");
        return;
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": lastBlob }),
      ]);
      setCopiedImage(true);
      toast.success("PNG copied to clipboard.");
      window.setTimeout(() => setCopiedImage(false), 1800);
    } catch {
      toast.error("Could not copy image to clipboard.");
    }
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select a PNG, JPEG, or WebP image.");
      return;
    }
    try {
      const dataUri = await compressImageFileToDataUri(file);
      setLocalFileName(file.name);
      setConfig((prev) => ({
        ...prev,
        imageDataUri: dataUri,
        layout: prev.layout === "minimal" ? "spotlight" : prev.layout,
      }));
      toast.success("Visual attached to card.");
    } catch {
      toast.error("Could not process that image.");
    }
  }

  const formattedSize = useMemo(() => {
    if (!renderMeta) return null;
    const kb = renderMeta.bytes / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB · ${renderMeta.ms} ms`;
  }, [renderMeta]);

  return (
    <div className="admin-studio-shell og-studio-shell">
      {/* Studio Sub-Toolbar */}
      <header className="admin-studio-toolbar">
        <div className="admin-studio-toolbar-left">
          <span className="admin-studio-pill">
            <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} size={13} />
            <span>Bloom Spotlight</span>
          </span>

          <div
            className="admin-template-strip"
            role="group"
            aria-label="Quick style presets"
          >
            {STUDIO_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="admin-chip-btn"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    ...tpl.patch,
                  }))
                }
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-studio-toolbar-right">
          <label className="admin-inline-toggle">
            <Switch
              checked={autoRender}
              onCheckedChange={(checked) => setAutoRender(Boolean(checked))}
            />
            <span>Live render</span>
          </label>

          {!autoRender && (
            <Button
              size="xs"
              variant="outline"
              loading={rendering}
              onClick={() => void renderCard(config)}
            >
              <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} size={13} />
              <span>Render</span>
            </Button>
          )}

          <Button
            size="xs"
            variant="outline"
            disabled={!lastBlob}
            onClick={() => void handleCopyPng()}
          >
            <HugeiconsIcon
              icon={copiedImage ? Tick02Icon : Copy01Icon}
              strokeWidth={2}
              size={13}
            />
            <span>{copiedImage ? "Copied" : "Copy PNG"}</span>
          </Button>

          {!config.imageDataUri && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                window.open(
                  getShareEndpointUrl(config),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              aria-label="Open rendered PNG in new tab"
            >
              <HugeiconsIcon
                icon={ArrowUpRight01Icon}
                strokeWidth={2}
                size={13}
              />
              <span>Open</span>
            </Button>
          )}

          <Button
            size="xs"
            loading={downloading}
            onClick={() => void handleDownloadPng()}
          >
            <HugeiconsIcon icon={Download04Icon} strokeWidth={2} size={13} />
            <span>Download PNG</span>
          </Button>
        </div>
      </header>

      {/* Main Two-Pane Studio Body */}
      <div className="og-studio-body">
        {/* Left Inspector Rail */}
        <aside className="og-studio-inspector">
          <nav
            className="admin-segmented-tabs"
            aria-label="Card inspector sections"
          >
            {(
              [
                { id: "content", label: "Content", icon: TextFontIcon },
                { id: "bloom", label: "Bloom", icon: PaintBoardIcon },
                { id: "layout", label: "Layout", icon: Layers01Icon },
                { id: "media", label: "Media", icon: Image02Icon },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInspectorTab(tab.id)}
                className={`admin-segmented-tab${inspectorTab === tab.id ? " is-active" : ""}`}
              >
                <HugeiconsIcon icon={tab.icon} strokeWidth={2} size={13} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="og-studio-inspector-scroll">
            {inspectorTab === "content" && (
              <div className="admin-form-stack">
                <div className="admin-field-block">
                  <div className="admin-field-row">
                    <label className="admin-field-label" htmlFor="og-title">
                      Headline
                    </label>
                    <span className="admin-field-counter tabular-nums">
                      {config.title.length}/180
                    </span>
                  </div>
                  <Textarea
                    id="og-title"
                    size="sm"
                    rows={2}
                    maxLength={180}
                    value={config.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="Card headline..."
                  />
                </div>

                <div className="admin-field-block">
                  <div className="admin-field-row">
                    <label className="admin-field-label" htmlFor="og-desc">
                      Subtitle / Excerpt
                    </label>
                    <span className="admin-field-counter tabular-nums">
                      {config.description.length}/320
                    </span>
                  </div>
                  <Textarea
                    id="og-desc"
                    size="sm"
                    rows={3}
                    maxLength={320}
                    value={config.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Concise summary shown beneath the title..."
                  />
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="og-cat">
                      Category Badge
                    </label>
                    <Input
                      id="og-cat"
                      size="sm"
                      value={config.category}
                      onChange={(e) => update("category", e.target.value)}
                      placeholder="Mechatronics"
                    />
                  </div>
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="og-kicker">
                      Kicker / Series
                    </label>
                    <Input
                      id="og-kicker"
                      size="sm"
                      value={config.kicker}
                      onChange={(e) => update("kicker", e.target.value)}
                      placeholder="Oct 2026 · Part I"
                    />
                  </div>
                </div>

                <div className="admin-chip-wrap">
                  {QUICK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => update("category", cat)}
                      className={`admin-chip-btn${config.category === cat ? " is-active" : ""}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="og-tags">
                    Topic Tags (comma-separated)
                  </label>
                  <Input
                    id="og-tags"
                    size="sm"
                    value={config.tags}
                    onChange={(e) => update("tags", e.target.value)}
                    placeholder="Kinematics, ROS2, Control"
                  />
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Header Glyph</span>
                  <Select
                    items={ICON_SELECT_ITEMS}
                    value={config.icon}
                    onValueChange={(val) => {
                      if (val) update("icon", val as OgIconId);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup>
                      {ICON_SELECT_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="og-author">
                      Author
                    </label>
                    <Input
                      id="og-author"
                      size="sm"
                      value={config.author}
                      onChange={(e) => update("author", e.target.value)}
                    />
                  </div>
                  <div className="admin-field-block">
                    <label className="admin-field-label" htmlFor="og-url">
                      Domain Label
                    </label>
                    <Input
                      id="og-url"
                      size="sm"
                      value={config.siteUrl}
                      onChange={(e) => update("siteUrl", e.target.value)}
                    />
                  </div>
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="og-sitename">
                    Publication / Subtitle
                  </label>
                  <Input
                    id="og-sitename"
                    size="sm"
                    value={config.siteName}
                    onChange={(e) => update("siteName", e.target.value)}
                  />
                </div>
              </div>
            )}

            {inspectorTab === "bloom" && (
              <div className="admin-form-stack">
                <div className="admin-field-block">
                  <span className="admin-field-label">Bloom Backdrop</span>
                  <div className="og-backdrop-grid">
                    {(Object.keys(OG_BACKDROPS) as OgBackdropId[]).map((id) => {
                      const item = OG_BACKDROPS[id];
                      const active = config.backdrop === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              backdrop: id,
                              cardTone: id === "daylight" ? "light" : "dark",
                            }))
                          }
                          className={`og-backdrop-tile${active ? " is-active" : ""}`}
                        >
                          <span
                            className="og-backdrop-swatch"
                            style={{ background: item.swatch }}
                            aria-hidden
                          />
                          <span className="og-backdrop-name">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Accent Spectrum</span>
                  <div className="og-accent-row">
                    {(Object.keys(OG_ACCENTS) as OgAccentId[]).map((accId) => {
                      const acc = OG_ACCENTS[accId];
                      const active = config.accent === accId;
                      return (
                        <button
                          key={accId}
                          type="button"
                          title={acc.label}
                          aria-label={acc.label}
                          onClick={() => update("accent", accId)}
                          className={`og-accent-dot${active ? " is-active" : ""}`}
                          style={{ backgroundColor: acc.hex }}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <span className="admin-field-label">Card Surface</span>
                    <Select
                      items={CARD_TONE_SELECT_ITEMS}
                      value={config.cardTone}
                      onValueChange={(v) => {
                        if (v === "dark" || v === "light")
                          update("cardTone", v);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {CARD_TONE_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>

                  <div className="admin-field-block">
                    <span className="admin-field-label">Backdrop Contrast</span>
                    <Select
                      items={VIGNETTE_SELECT_ITEMS}
                      value={config.vignette}
                      onValueChange={(v) => {
                        if (v === "subtle" || v === "medium" || v === "deep") {
                          update("vignette", v);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {VIGNETTE_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Technical Pattern</span>
                  <div className="admin-chip-wrap">
                    {(Object.keys(OG_PATTERNS) as OgPatternId[]).map((pid) => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => update("pattern", pid)}
                        className={`admin-chip-btn${config.pattern === pid ? " is-active" : ""}`}
                      >
                        {OG_PATTERNS[pid]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === "layout" && (
              <div className="admin-form-stack">
                <div className="admin-field-block">
                  <span className="admin-field-label">Canvas Aspect</span>
                  <div className="og-preset-grid">
                    {(Object.keys(CANVAS_PRESETS) as OgCanvasPreset[]).map(
                      (key) => {
                        const p = CANVAS_PRESETS[key];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => update("preset", key)}
                            className={`og-preset-card${config.preset === key ? " is-active" : ""}`}
                          >
                            <strong>{p.label}</strong>
                            <small className="tabular-nums">{p.sublabel}</small>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Card Architecture</span>
                  <div className="og-preset-grid">
                    {(Object.keys(OG_LAYOUTS) as OgLayoutId[]).map((lid) => {
                      const l = OG_LAYOUTS[lid];
                      return (
                        <button
                          key={lid}
                          type="button"
                          onClick={() => update("layout", lid)}
                          className={`og-preset-card${config.layout === lid ? " is-active" : ""}`}
                        >
                          <strong>{l.label}</strong>
                          <small>{l.description}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="admin-field-grid-2">
                  <div className="admin-field-block">
                    <span className="admin-field-label">Title Scale</span>
                    <Select
                      items={TITLE_SIZE_SELECT_ITEMS}
                      value={config.titleSize}
                      onValueChange={(v) => {
                        if (v)
                          update("titleSize", v as OgCustomConfig["titleSize"]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {TITLE_SIZE_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>

                  <div className="admin-field-block">
                    <span className="admin-field-label">Subtitle Scale</span>
                    <Select
                      items={DESC_SIZE_SELECT_ITEMS}
                      value={config.descSize}
                      onValueChange={(v) => {
                        if (v)
                          update("descSize", v as OgCustomConfig["descSize"]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {DESC_SIZE_SELECT_ITEMS.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Alignment</span>
                  <div className="admin-chip-wrap">
                    <button
                      type="button"
                      onClick={() => update("align", "left")}
                      className={`admin-chip-btn${config.align === "left" ? " is-active" : ""}`}
                    >
                      Left Aligned
                    </button>
                    <button
                      type="button"
                      onClick={() => update("align", "center")}
                      className={`admin-chip-btn${config.align === "center" ? " is-active" : ""}`}
                    >
                      Centered
                    </button>
                  </div>
                </div>

                <div className="admin-switch-list">
                  <label className="admin-switch-row">
                    <span>Show portrait in footer</span>
                    <Switch
                      checked={config.showAvatar}
                      onCheckedChange={(v) => update("showAvatar", Boolean(v))}
                    />
                  </label>
                  <label className="admin-switch-row">
                    <span>Show identity footer</span>
                    <Switch
                      checked={config.showFooter}
                      onCheckedChange={(v) => update("showFooter", Boolean(v))}
                    />
                  </label>
                  <label className="admin-switch-row">
                    <span>Specular 1px card border</span>
                    <Switch
                      checked={config.showBorder}
                      onCheckedChange={(v) => update("showBorder", Boolean(v))}
                    />
                  </label>
                </div>

                <Button
                  size="xs"
                  variant="ghost"
                  className="self-start"
                  onClick={() => {
                    setLocalFileName(null);
                    setConfig(DEFAULT_OG_CUSTOM_CONFIG);
                  }}
                >
                  Reset to studio defaults
                </Button>
              </div>
            )}

            {inspectorTab === "media" && (
              <div className="admin-form-stack">
                <div className="admin-field-block">
                  <span className="admin-field-label">
                    Local Artwork / Diagram
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {config.imageDataUri ? (
                    <div className="og-media-attached">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={config.imageDataUri}
                        alt="Attached artwork"
                        className="og-media-thumb"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {localFileName ?? "Attached image"}
                        </p>
                        <p className="text-[11px] text-[var(--muted-ink)]">
                          Embedded directly into render
                        </p>
                      </div>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Remove attached image"
                        onClick={() => {
                          setLocalFileName(null);
                          update("imageDataUri", undefined);
                        }}
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          strokeWidth={2}
                          size={14}
                        />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="og-upload-dropzone"
                    >
                      <HugeiconsIcon
                        icon={Upload04Icon}
                        strokeWidth={1.8}
                        size={20}
                      />
                      <span>Attach PNG, JPEG, or WebP from disk</span>
                      <small>
                        Renders in side frame (Spotlight / Split) or full bleed
                        (Editorial)
                      </small>
                    </button>
                  )}
                </div>

                <div className="admin-field-block">
                  <label className="admin-field-label" htmlFor="og-img-url">
                    Or Image URL (HTTPS or /images/…)
                  </label>
                  <Input
                    id="og-img-url"
                    size="sm"
                    value={config.image}
                    onChange={(e) => update("image", e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>

                <div className="admin-field-block">
                  <span className="admin-field-label">Image Framing</span>
                  <div className="admin-chip-wrap">
                    <button
                      type="button"
                      onClick={() => update("imageFit", "cover")}
                      className={`admin-chip-btn${config.imageFit === "cover" ? " is-active" : ""}`}
                    >
                      Fill Frame (Cover)
                    </button>
                    <button
                      type="button"
                      onClick={() => update("imageFit", "contain")}
                      className={`admin-chip-btn${config.imageFit === "contain" ? " is-active" : ""}`}
                    >
                      Fit Entire Diagram (Contain)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right Bloom Spotlight Stage */}
        <section className="og-studio-stage">
          <div className="og-studio-stage-bar">
            <div className="admin-segmented-tabs">
              <button
                type="button"
                onClick={() => setStageMode("canvas")}
                className={`admin-segmented-tab${stageMode === "canvas" ? " is-active" : ""}`}
              >
                <HugeiconsIcon icon={GridViewIcon} strokeWidth={2} size={13} />
                <span>Canvas Stage</span>
              </button>
              <button
                type="button"
                onClick={() => setStageMode("social")}
                className={`admin-segmented-tab${stageMode === "social" ? " is-active" : ""}`}
              >
                <HugeiconsIcon icon={Layers01Icon} strokeWidth={2} size={13} />
                <span>Social Unfurl</span>
              </button>
            </div>

            <div className="og-stage-telemetry tabular-nums">
              <span>
                {dimensions.width} × {dimensions.height}
              </span>
              {formattedSize && <span>· {formattedSize}</span>}
              {rendering && (
                <span className="og-stage-rendering">· Rendering…</span>
              )}
            </div>
          </div>

          <div className="og-studio-viewport">
            <div
              className="og-bloom-halo"
              style={{ background: activeBackdrop.swatch }}
              aria-hidden
            />

            {stageMode === "canvas" ? (
              <div
                className="og-canvas-frame"
                style={{
                  aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                  maxWidth: config.preset === "square" ? "470px" : "680px",
                }}
              >
                {previewBlobUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewBlobUrl}
                    alt={config.title}
                    className={`og-canvas-img${rendering ? " is-updating" : ""}`}
                  />
                ) : (
                  <div className="og-canvas-placeholder">
                    <span>Preparing Bloom canvas…</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="og-social-card-preview">
                <div className="og-social-card-media">
                  {previewBlobUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewBlobUrl} alt={config.title} />
                  )}
                </div>
                <div className="og-social-card-meta">
                  <span className="og-social-domain">
                    {config.siteUrl || "pmengineer.lk"}
                  </span>
                  <strong className="og-social-title">{config.title}</strong>
                  {config.description && (
                    <p className="og-social-desc">{config.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
