"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Search,
  Power,
  Settings as SettingsIcon,
  Wifi,
  Volume2,
  Battery,
  BatteryMedium,
  Bluetooth,
  Plane,
  Moon,
  Sun,
  Monitor,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Minus,
  Square,
  Copy,
  Layers,
  Grid3X3,
  LayoutGrid,
  FileText,
  Folder,
  FolderOpen,
  User,
  Briefcase,
  Mail,
  Globe,
  Palette,
  ImageIcon,
  ExternalLink,
  Github,
  Linkedin,
  MapPin,
  Calendar,
  Clock,
  Bell,
  SunMedium,
  Volume1,
  RefreshCw,
  Eye,
  ArrowUpDown,
  MonitorSmartphone,
  LogOut,
  Lock,
  RotateCcw,
  Trash2,
  Pin,
  Edit3,
  Share2,
  Tag,
  Building2,
  GraduationCap,
  Code2,
  Brush,
  Smartphone,
  ChevronUpIcon,
  Maximize2,
  Minimize2,
  SearchIcon,
} from "lucide-react";
import { projects as projectsData, experience } from "@/lib/data";

/* ─── Types ─── */
type AppId = "explorer" | "about" | "experience" | "contact" | "settings" | "browser" | "notepad";
type Theme = "light" | "dark";
type Wallpaper = "bloom" | "hill" | "workbench";
type WindowState = {
  id: string;
  appId: AppId;
  title: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
  rect: { x: number; y: number; w: number; h: number };
  prevRect?: { x: number; y: number; w: number; h: number };
};
type DesktopIcon = {
  id: string;
  appId: AppId;
  label: string;
  kind: "folder" | "file" | "app";
  icon: string;
  col?: number;
  row?: number;
};
type SnapTarget = "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null;

/* ─── Registry ─── */
const APP_META: Record<AppId, { title: string; icon: string; kind: string }> = {
  explorer: { title: "Selected work", icon: "/icons/thesvg/azure-folder-blank.svg", kind: "Folder" },
  about: { title: "About — Prasad M.", icon: "/icons/fluent-color/account.svg", kind: "App" },
  experience: { title: "Experience", icon: "/icons/fluent-color/documents_folder.svg", kind: "Folder" },
  contact: { title: "Contact", icon: "/icons/fluent-color/user_folder.svg", kind: "App" },
  settings: { title: "Settings", icon: "/icons/thesvg/files.svg", kind: "App" },
  browser: { title: "Edge — Links", icon: "/icons/fluent-color/link_folder.svg", kind: "App" },
  notepad: { title: "Read Me.txt", icon: "/icons/thesvg/notepadplusplus.svg", kind: "Text document" },
};

const WALLPAPERS: Record<Wallpaper, { src: string; label: string }> = {
  bloom: { src: "/images/desktop-bloom-wallpaper.webp", label: "Bloom" },
  hill: { src: "/images/hill-country-wallpaper.webp", label: "Hill Country" },
  workbench: { src: "/images/workbench-wallpaper.webp", label: "Workbench" },
};

const DESKTOP_ICONS: DesktopIcon[] = [
  { id: "d-explorer", appId: "explorer", label: "Selected work", kind: "folder", icon: "/icons/thesvg/azure-folder-blank.svg" },
  { id: "d-notepad", appId: "notepad", label: "Read Me.txt", kind: "file", icon: "/icons/thesvg/azure-file.svg" },
  { id: "d-about", appId: "about", label: "About.lnk", kind: "app", icon: "/icons/fluent-color/account.svg" },
  { id: "d-exp", appId: "experience", label: "Experience", kind: "folder", icon: "/icons/fluent-color/documents_folder.svg" },
  { id: "d-contact", appId: "contact", label: "Contact", kind: "app", icon: "/icons/fluent-color/user_folder.svg" },
  { id: "d-settings", appId: "settings", label: "Settings", kind: "app", icon: "/icons/thesvg/files.svg" },
  { id: "d-browser", appId: "browser", label: "Links", kind: "app", icon: "/icons/fluent-color/link_folder.svg" },
];

const PINNED_APPS: AppId[] = ["explorer", "about", "experience", "contact", "settings", "browser", "notepad"];
const RECOMMENDED = [
  { appId: "explorer" as AppId, subtitle: "Opened 12 min ago" },
  { appId: "notepad" as AppId, subtitle: "Edited yesterday" },
  { appId: "experience" as AppId, subtitle: "Viewed 2h ago" },
  { appId: "about" as AppId, subtitle: "Updated this week" },
  { appId: "contact" as AppId, subtitle: "New message" },
  { appId: "settings" as AppId, subtitle: "Appearance changed" },
];

/* ─── Helpers ─── */
function SvgIcon({ src, size = 24, alt = "" }: { src: string; size?: number; alt?: string }) {
  return <Image src={src} alt={alt} width={size} height={size} unoptimized draggable={false} style={{ width: size, height: size }} />;
}
function nowTime() {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
}
function nowDate() {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
}
function shortDate() {
  return new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "numeric" }).format(new Date());
}

/* ─── Main ─── */
export default function Home() {
  // Theme & wallpaper
  const [theme, setTheme] = useState<Theme>("light");
  const [wallpaper, setWallpaper] = useState<Wallpaper>("bloom");
  const [accent, setAccent] = useState("#0067c0");

  // Windows
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZ, setNextZ] = useState(10);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [resize, setResize] = useState<{ id: string; dir: string; startX: number; startY: number; startRect: WindowState["rect"] } | null>(null);
  const [snapOverlay, setSnapOverlay] = useState<string | null>(null);
  const [showWidgets, setShowWidgets] = useState(false);

  // Desktop
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [desktopIcons, setDesktopIcons] = useState<DesktopIcon[]>(DESKTOP_ICONS);
  const [iconLabels, setIconLabels] = useState<Record<string, string>>({});

  // Flyouts
  const [startOpen, setStartOpen] = useState(false);
  const [startSearch, setStartSearch] = useState("");
  const [startAllApps, setStartAllApps] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [trayExpanded, setTrayExpanded] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; kind: "desktop" | "icon"; iconId?: string } | null>(null);
  const [taskbarCtx, setTaskbarCtx] = useState<{ x: number; y: number } | null>(null);

  // Clock
  const [clock, setClock] = useState<{ t: string; d: string; full: string } | null>(null);
  const desktopRef = useRef<HTMLDivElement>(null);

  // Load persisted
  useEffect(() => {
    try {
      const t = localStorage.getItem("pm-theme") as Theme | null;
      const w = localStorage.getItem("pm-wallpaper") as Wallpaper | null;
      const a = localStorage.getItem("pm-accent");
      if (t === "light" || t === "dark") setTheme(t);
      else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
      if (w && WALLPAPERS[w]) setWallpaper(w);
      if (a) setAccent(a);
    } catch {}
    setClock({ t: nowTime(), d: shortDate(), full: nowDate() });
    const iv = setInterval(() => setClock({ t: nowTime(), d: shortDate(), full: nowDate() }), 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute("data-wallpaper", wallpaper);
    try {
      localStorage.setItem("pm-theme", theme);
      localStorage.setItem("pm-wallpaper", wallpaper);
      localStorage.setItem("pm-accent", accent);
    } catch {}
    document.documentElement.style.setProperty("--flu-accent", accent);
  }, [theme, wallpaper, accent]);

  // Global ESC
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (ctx) setCtx(null);
        else if (taskbarCtx) setTaskbarCtx(null);
        else if (startOpen) setStartOpen(false);
        else if (calendarOpen) setCalendarOpen(false);
        else if (quickOpen) setQuickOpen(false);
        else if (showWidgets) setShowWidgets(false);
        else if (windows.some((w) => !w.minimized)) {
          // close top window
          const top = [...windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
          if (top) closeWindow(top.id);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [ctx, taskbarCtx, startOpen, calendarOpen, quickOpen, showWidgets, windows]);

  // Window ops
  const openApp = useCallback(
    (appId: AppId) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.appId === appId);
        if (existing) {
          // restore if minimized, bring to front
          const nz = nextZ + 1;
          setNextZ(nz);
          return prev.map((w) => (w.id === existing.id ? { ...w, minimized: false, z: nz } : w));
        }
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;
        const isMobile = vw < 768;
        const w = isMobile ? vw - 16 : 720;
        const h = isMobile ? vh - 72 : 480;
        const x = isMobile ? 8 : Math.round((vw - w) / 2 + (prev.length * 24) % 120);
        const y = isMobile ? 8 : Math.round((vh - h) / 2 - 20 + (prev.length * 18) % 80);
        const nz = nextZ + 1;
        setNextZ(nz);
        return [
          ...prev,
          {
            id: `${appId}-${Date.now()}`,
            appId,
            title: APP_META[appId].title,
            minimized: false,
            maximized: isMobile,
            z: nz,
            rect: { x, y, w, h },
          },
        ];
      });
      setStartOpen(false);
      setCtx(null);
    },
    [nextZ]
  );

  const closeWindow = (id: string) => setWindows((p) => p.filter((w) => w.id !== id));
  const minimizeWindow = (id: string) => setWindows((p) => p.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  const maximizeWindow = (id: string) =>
    setWindows((p) =>
      p.map((w) => {
        if (w.id !== id) return w;
        if (w.maximized) {
          return { ...w, maximized: false, rect: w.prevRect ?? w.rect, prevRect: undefined };
        } else {
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          return {
            ...w,
            maximized: true,
            prevRect: w.rect,
            rect: { x: 0, y: 0, w: vw, h: vh - 48 },
          };
        }
      })
    );

  const focusWindow = (id: string) => {
    setWindows((p) => {
      const w = p.find((x) => x.id === id);
      if (!w || w.z === nextZ) return p;
      const nz = nextZ + 1;
      setNextZ(nz);
      return p.map((x) => (x.id === id ? { ...x, z: nz, minimized: false } : x));
    });
  };

  const snapWindow = (id: string, target: SnapTarget) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 48;
    let rect: WindowState["rect"] | null = null;
    if (target === "left") rect = { x: 0, y: 0, w: vw / 2, h: vh };
    if (target === "right") rect = { x: vw / 2, y: 0, w: vw / 2, h: vh };
    if (target === "top-left") rect = { x: 0, y: 0, w: vw / 2, h: vh / 2 };
    if (target === "top-right") rect = { x: vw / 2, y: 0, w: vw / 2, h: vh / 2 };
    if (target === "bottom-left") rect = { x: 0, y: vh / 2, w: vw / 2, h: vh / 2 };
    if (target === "bottom-right") rect = { x: vw / 2, y: vh / 2, w: vw / 2, h: vh / 2 };
    if (!rect) return;
    setWindows((p) => p.map((w) => (w.id === id ? { ...w, rect, maximized: false, prevRect: w.maximized ? w.prevRect : w.rect } : w)));
    setSnapOverlay(null);
  };

  // Drag
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== drag.id || w.maximized) return w;
          return { ...w, rect: { ...w.rect, x: e.clientX - drag.dx, y: e.clientY - drag.dy } };
        })
      );
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag]);

  // Resize
  useEffect(() => {
    if (!resize) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - resize.startX;
      const dy = e.clientY - resize.startY;
      setWindows((prev) =>
        prev.map((w) => {
          if (w.id !== resize.id) return w;
          let { x, y, w: ww, h: hh } = resize.startRect;
          const minW = 360, minH = 240;
          if (resize.dir.includes("e")) ww = Math.max(minW, resize.startRect.w + dx);
          if (resize.dir.includes("s")) hh = Math.max(minH, resize.startRect.h + dy);
          if (resize.dir.includes("w")) {
            const nw = Math.max(minW, resize.startRect.w - dx);
            x = resize.startRect.x + (resize.startRect.w - nw);
            ww = nw;
          }
          if (resize.dir.includes("n")) {
            const nh = Math.max(minH, resize.startRect.h - dy);
            y = resize.startRect.y + (resize.startRect.h - nh);
            hh = nh;
          }
          return { ...w, rect: { x, y, w: ww, h: hh } };
        })
      );
    };
    const onUp = () => setResize(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resize]);

  // Desktop interactions
  const onDesktopPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".desktop-shortcut, .ctx-menu, .start-panel, .flyout, .window, .taskbar, .widgets-panel")) return;
    // start marquee + deselect if not modifier
    if (!e.ctrlKey && !e.metaKey) setSelection(new Set());
    const rect = desktopRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX, sy = e.clientY;
    setMarquee({ x: sx, y: sy, w: 0, h: 0 });
    const onMove = (ev: PointerEvent) => {
      const nx = Math.min(sx, ev.clientX);
      const ny = Math.min(sy, ev.clientY);
      const nw = Math.abs(ev.clientX - sx);
      const nh = Math.abs(ev.clientY - sy);
      setMarquee({ x: nx, y: ny, w: nw, h: nh });
      // select icons inside
      const icons = desktopRef.current?.querySelectorAll<HTMLElement>(".desktop-shortcut");
      if (!icons) return;
      const sel = new Set<string>();
      icons.forEach((el) => {
        const r = el.getBoundingClientRect();
        const inside = r.left < nx + nw && r.right > nx && r.top < ny + nh && r.bottom > ny;
        if (inside) {
          const id = el.dataset.id!;
          if (id) sel.add(id);
        }
      });
      if (sel.size) setSelection(sel);
    };
    const onUp = () => {
      setMarquee(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onIconClick = (e: React.MouseEvent, icon: DesktopIcon) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelection((prev) => {
        const n = new Set(prev);
        if (n.has(icon.id)) n.delete(icon.id);
        else n.add(icon.id);
        return n;
      });
    } else {
      setSelection(new Set([icon.id]));
    }
  };
  const onIconDoubleClick = (icon: DesktopIcon) => openApp(icon.appId);

  // Filtered apps for Start search
  const filteredApps = useMemo(() => {
    if (!startSearch.trim()) return null;
    const q = startSearch.toLowerCase();
    const all: AppId[] = ["explorer", "about", "experience", "contact", "settings", "browser", "notepad"];
    return all.filter((id) => APP_META[id].title.toLowerCase().includes(q) || id.includes(q));
  }, [startSearch]);

  const runningApps = useMemo(() => {
    const map = new Map<AppId, WindowState>();
    windows.forEach((w) => {
      if (!map.has(w.appId)) map.set(w.appId, w);
      else {
        const ex = map.get(w.appId)!;
        if (w.z > ex.z) map.set(w.appId, w);
      }
    });
    return map;
  }, [windows]);

  const taskbarApps: AppId[] = ["explorer", "about", "experience", "contact", "browser"];

  return (
    <div
      ref={desktopRef}
      className="desktop-root"
      data-theme={theme}
      data-wallpaper={wallpaper}
      onPointerDown={onDesktopPointerDown}
      onContextMenu={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest(".ctx-menu, .taskbar, .window, .start-panel, .flyout, .widgets-panel")) return;
        e.preventDefault();
        const iconEl = t.closest<HTMLElement>(".desktop-shortcut");
        if (iconEl?.dataset.id) {
          const id = iconEl.dataset.id;
          if (!selection.has(id)) setSelection(new Set([id]));
          setCtx({ x: e.clientX, y: e.clientY, kind: "icon", iconId: id });
        } else {
          setCtx({ x: e.clientX, y: e.clientY, kind: "desktop" });
        }
      }}
      onClick={() => {
        if (ctx) setCtx(null);
        if (taskbarCtx) setTaskbarCtx(null);
      }}
    >
      <Toaster position="bottom-right" richColors closeButton theme={theme} />

      {/* Wallpaper */}
      <Image
        src={WALLPAPERS[wallpaper].src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="desktop-wallpaper"
        style={{ objectFit: "cover" }}
      />
      <div className="wallpaper-tint" aria-hidden />

      {/* Widgets button — subtle left edge */}
      <button
        aria-label="Open Widgets"
        onClick={() => setShowWidgets((v) => !v)}
        className="absolute left-2 top-2 z-10 hidden md:grid place-items-center size-8 rounded-full bg-black/10 backdrop-blur text-white hover:bg-black/20 transition-colors"
        title="Widgets"
      >
        <LayoutGrid size={14} />
      </button>

      {/* Desktop icons */}
      <div className="desktop-grid" role="list" aria-label="Desktop icons">
        {desktopIcons.map((icon) => {
          const label = iconLabels[icon.id] ?? icon.label;
          const selected = selection.has(icon.id);
          const isRenaming = renaming === icon.id;
          return (
            <button
              key={icon.id}
              data-id={icon.id}
              role="listitem"
              className={`desktop-shortcut ${selected ? "is-selected" : ""}`}
              onClick={(e) => onIconClick(e, icon)}
              onDoubleClick={() => onIconDoubleClick(icon)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openApp(icon.appId);
                if (e.key === "F2") {
                  setRenaming(icon.id);
                  setRenameVal(label);
                }
                if (e.key === "Delete") toast.info("Recycle Bin is not implemented — files stay on the desktop.");
              }}
              aria-label={`${label} — double click to open`}
            >
              <span className="shortcut-icon">
                <SvgIcon src={icon.icon} size={38} alt="" />
              </span>
              {isRenaming ? (
                <input
                  autoFocus
                  className="shortcut-rename"
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onBlur={() => {
                    if (renameVal.trim()) setIconLabels((p) => ({ ...p, [icon.id]: renameVal.trim() }));
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (renameVal.trim()) setIconLabels((p) => ({ ...p, [icon.id]: renameVal.trim() }));
                      setRenaming(null);
                    }
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="shortcut-label">{label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Marquee */}
      {marquee && <div className="marquee" style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }} />}

      {/* Windows */}
      <AnimatePresence>
        {windows
          .filter((w) => !w.minimized)
          .sort((a, b) => a.z - b.z)
          .map((w) => (
            <motion.section
              key={w.id}
              layout={false}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
              className={`window ${w.maximized ? "is-maximized" : ""}`}
              style={{
                left: w.rect.x,
                top: w.rect.y,
                width: w.rect.w,
                height: w.rect.h,
                zIndex: w.z,
              }}
              onPointerDown={() => focusWindow(w.id)}
              role="dialog"
              aria-label={w.title}
              aria-modal={false}
            >
              {/* Titlebar */}
              <header
                className="window-titlebar"
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest(".window-controls")) return;
                  if (w.maximized) return;
                  const rect = w.rect;
                  setDrag({ id: w.id, dx: e.clientX - rect.x, dy: e.clientY - rect.y });
                  focusWindow(w.id);
                }}
                onDoubleClick={() => maximizeWindow(w.id)}
              >
                <SvgIcon src={APP_META[w.appId].icon} size={16} alt="" />
                <span className="window-title">{w.title}</span>
                <div className="window-controls">
                  <button className="win-btn" aria-label="Minimize" onClick={() => minimizeWindow(w.id)}>
                    <Minus />
                  </button>
                  <button
                    className="win-btn"
                    aria-label={w.maximized ? "Restore" : "Maximize"}
                    onClick={() => maximizeWindow(w.id)}
                    onPointerEnter={() => {
                      // show snap overlay after delay
                      const id = w.id;
                      const t = setTimeout(() => setSnapOverlay(id), 500);
                      (window as any)._snapTimer = t;
                    }}
                    onPointerLeave={() => {
                      clearTimeout((window as any)._snapTimer);
                      // don't auto-hide if mouse moves to overlay — overlay handles itself
                      setTimeout(() => {
                        const el = document.querySelector(".snap-overlay:hover");
                        if (!el) setSnapOverlay((v) => (v === w.id ? null : v));
                      }, 120);
                    }}
                  >
                    {w.maximized ? <Copy size={12} /> : <Square size={10} />}
                  </button>
                  <button className="win-btn close" aria-label="Close" onClick={() => closeWindow(w.id)}>
                    <X />
                  </button>
                </div>
              </header>

              {/* Snap overlay */}
              {snapOverlay === w.id && (
                <div
                  className="snap-overlay"
                  onMouseLeave={() => setSnapOverlay(null)}
                  onClick={() => setSnapOverlay(null)}
                >
                  <button className="snap-zone" onClick={() => snapWindow(w.id, "left")}>
                    ◧ Left 50%
                  </button>
                  <button className="snap-zone" onClick={() => snapWindow(w.id, "right")}>
                    ◨ Right 50%
                  </button>
                  <button className="snap-zone" onClick={() => snapWindow(w.id, "top-left")}>
                    ◰ Top-left
                  </button>
                  <button className="snap-zone" onClick={() => snapWindow(w.id, "bottom-right")}>
                    ◳ Bottom-right
                  </button>
                </div>
              )}

              {/* Body */}
              <div className="window-body">
                {w.appId === "explorer" && <ExplorerApp />}
                {w.appId === "notepad" && <NotepadApp />}
                {w.appId === "about" && <AboutApp />}
                {w.appId === "experience" && <ExperienceApp />}
                {w.appId === "contact" && <ContactApp />}
                {w.appId === "settings" && (
                  <SettingsApp
                    theme={theme}
                    setTheme={setTheme}
                    wallpaper={wallpaper}
                    setWallpaper={setWallpaper}
                    accent={accent}
                    setAccent={setAccent}
                  />
                )}
                {w.appId === "browser" && <BrowserApp />}
              </div>

              {/* Resize handles */}
              {!w.maximized && (
                <>
                  {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const).map((dir) => (
                    <span
                      key={dir}
                      className={`resize-handle ${dir}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setResize({ id: w.id, dir, startX: e.clientX, startY: e.clientY, startRect: w.rect });
                      }}
                    />
                  ))}
                </>
              )}
            </motion.section>
          ))}
      </AnimatePresence>

      {/* Taskbar */}
      <nav className="taskbar" aria-label="Taskbar" onContextMenu={(e) => { e.preventDefault(); setTaskbarCtx({ x: e.clientX, y: e.clientY }); }}>
        <div className="taskbar-left md:hidden">
          <button className="tray-chevron" onClick={() => setShowWidgets((v) => !v)} aria-label="Widgets">
            <LayoutGrid size={14} />
          </button>
        </div>

        <div className="taskbar-center">
          <button
            className={`taskbar-icon ${startOpen ? "is-active is-running" : ""}`}
            aria-label={startOpen ? "Close Start" : "Open Start"}
            aria-expanded={startOpen}
            onClick={() => {
              setStartOpen((v) => !v);
              setStartAllApps(false);
              setStartSearch("");
              setCalendarOpen(false);
              setQuickOpen(false);
            }}
          >
            <SvgIcon src="/icons/thesvg/icon.svg" size={20} />
          </button>

          <button
            className="taskbar-icon hidden sm:grid"
            aria-label="Search"
            onClick={() => {
              setStartOpen(true);
              setStartAllApps(false);
              setTimeout(() => document.getElementById("start-search-input")?.focus(), 100);
            }}
            title="Search"
          >
            <Search size={16} />
          </button>

          {taskbarApps.map((appId) => {
            const run = runningApps.get(appId);
            const isActive = run && !run.minimized;
            const isMinimized = run?.minimized;
            return (
              <button
                key={appId}
                className={`taskbar-icon ${run ? "is-running" : ""} ${isActive ? "is-active" : ""} ${isMinimized ? "is-minimized" : ""}`}
                aria-label={APP_META[appId].title}
                onClick={() => {
                  if (run) {
                    if (isMinimized || run.z !== nextZ) focusWindow(run.id);
                    else minimizeWindow(run.id);
                  } else openApp(appId);
                }}
                title={APP_META[appId].title}
              >
                <SvgIcon src={APP_META[appId].icon} size={20} />
              </button>
            );
          })}

          {/* Explorer quick toggle */}
          <button
            className={`taskbar-icon hidden sm:grid ${runningApps.get("explorer") ? "is-running" : ""}`}
            aria-label="File Explorer"
            onClick={() => {
              const r = runningApps.get("explorer");
              if (r) {
                if (r.minimized || r.z !== nextZ) focusWindow(r.id);
                else minimizeWindow(r.id);
              } else openApp("explorer");
            }}
            title="File Explorer"
          >
            <FolderOpen size={18} />
          </button>
        </div>

        <div className="taskbar-right">
          <button className="tray-chevron hidden sm:grid" aria-label="Show hidden icons" onClick={() => setTrayExpanded((v) => !v)} title="Hidden icons">
            <ChevronUp size={14} />
          </button>

          <div
            className="tray-group"
            role="button"
            tabIndex={0}
            aria-label="Quick settings"
            aria-expanded={quickOpen}
            onClick={() => {
              setQuickOpen((v) => !v);
              setCalendarOpen(false);
              setStartOpen(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && setQuickOpen((v) => !v)}
          >
            <Wifi size={15} />
            <Volume2 size={15} />
            <BatteryMedium size={15} />
          </div>

          <div
            className="taskbar-clock"
            role="button"
            tabIndex={0}
            aria-label="Calendar and notifications"
            aria-expanded={calendarOpen}
            onClick={() => {
              setCalendarOpen((v) => !v);
              setQuickOpen(false);
              setStartOpen(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && setCalendarOpen((v) => !v)}
          >
            <time>{clock?.t ?? "--:--"}</time>
            <span>{clock?.d ?? ""}</span>
          </div>

          <button className="hidden md:grid place-items-center size-7 rounded hover:bg-black/5 dark:hover:bg-white/10" aria-label="Notifications" onClick={() => toast.info("Notifications — no new alerts.")}>
            <Bell size={14} />
          </button>
        </div>
      </nav>

      {/* Start Menu */}
      <AnimatePresence>
        {startOpen && (
          <>
            <div className="start-backdrop" onClick={() => setStartOpen(false)} aria-hidden />
            <motion.aside
              className="start-panel"
              role="dialog"
              aria-label="Start menu"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="start-search-wrap">
                <label className="start-search">
                  <Search size={16} />
                  <input
                    id="start-search-input"
                    placeholder="Search apps, settings, and documents"
                    value={startSearch}
                    onChange={(e) => setStartSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredApps?.[0]) openApp(filteredApps[0]);
                    }}
                  />
                  {startSearch && (
                    <button onClick={() => setStartSearch("")} aria-label="Clear search">
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>

              <div className="start-content">
                {filteredApps ? (
                  <>
                    <div className="start-section-head">
                      <h2>Results for “{startSearch}”</h2>
                      <button className="start-more-btn" onClick={() => setStartSearch("")}>
                        Clear <X size={12} />
                      </button>
                    </div>
                    <div className="all-apps-list">
                      {filteredApps.length ? (
                        filteredApps.map((id) => (
                          <button key={id} className="all-apps-item" onClick={() => openApp(id)}>
                            <SvgIcon src={APP_META[id].icon} size={22} />
                            <span>{APP_META[id].title}</span>
                            <span className="all-apps-kind">{APP_META[id].kind}</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-[var(--muted-ink)] p-4">No results.</p>
                      )}
                    </div>
                  </>
                ) : startAllApps ? (
                  <>
                    <div className="start-section-head">
                      <h2>All apps</h2>
                      <button className="start-more-btn" onClick={() => setStartAllApps(false)}>
                        <ChevronLeft size={14} /> Back
                      </button>
                    </div>
                    <div className="all-apps-list">
                      {Object.entries(
                        PINNED_APPS.map((id) => APP_META[id].title[0].toUpperCase()).reduce(
                          (acc, letter, i) => {
                            const id = PINNED_APPS[i];
                            if (!acc[letter]) acc[letter] = [];
                            acc[letter].push(id);
                            return acc;
                          },
                          {} as Record<string, AppId[]>
                        )
                      )
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([letter, ids]) => (
                          <div key={letter} className="all-apps-group">
                            <div className="all-apps-letter">{letter}</div>
                            {ids.map((id) => (
                              <button key={id} className="all-apps-item" onClick={() => openApp(id)}>
                                <SvgIcon src={APP_META[id].icon} size={22} />
                                <span>{APP_META[id].title}</span>
                                <span className="all-apps-kind">{APP_META[id].kind}</span>
                              </button>
                            ))}
                          </div>
                        ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="start-section-head">
                      <h2>Pinned</h2>
                      <button className="start-more-btn" onClick={() => setStartAllApps(true)}>
                        All apps <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="pinned-grid">
                      {PINNED_APPS.map((id) => (
                        <button key={id} className="pinned-tile" onClick={() => openApp(id)}>
                          <SvgIcon src={APP_META[id].icon} size={28} />
                          <span>{APP_META[id].title}</span>
                        </button>
                      ))}
                    </div>

                    <div className="start-section-head">
                      <h2>Recommended</h2>
                      <button className="start-more-btn" onClick={() => setStartAllApps(true)}>
                        More <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="recommended-grid">
                      {RECOMMENDED.map((r) => (
                        <button key={r.appId} className="recommended-item" onClick={() => openApp(r.appId)}>
                          <SvgIcon src={APP_META[r.appId].icon} size={28} />
                          <span className="recommended-copy">
                            <strong>{APP_META[r.appId].title}</strong>
                            <small>{r.subtitle}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <footer className="start-footer">
                <div className="profile-chip">
                  <span className="profile-avatar">PM</span>
                  <span>Prasad M.</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="power-btn"
                    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                    onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                    title={theme === "light" ? "Dark mode" : "Light mode"}
                  >
                    {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                  </button>
                  <button className="power-btn" aria-label="Power" onClick={() => toast.info("Power options — this is a portfolio, not a real OS. 😉")} title="Power">
                    <Power size={16} />
                  </button>
                </div>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Calendar Flyout */}
      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            className="flyout calendar-flyout"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="calendar-header">
              <h3>{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date())}</h3>
              <div className="flex gap-1">
                <button className="power-btn" onClick={() => toast.info("Month picker — coming soon")} aria-label="Previous month">
                  <ChevronLeft size={14} />
                </button>
                <button className="power-btn" onClick={() => toast.info("Month picker — coming soon")} aria-label="Next month">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="calendar-days">
                {Array.from({ length: 35 }, (_, i) => {
                  const today = new Date().getDate();
                  const dayNum = i - 4 + 1; // offset to align
                  const inMonth = dayNum >= 1 && dayNum <= 31;
                  const isToday = dayNum === today && inMonth;
                  return (
                    <span key={i} className={`calendar-day ${isToday ? "is-today" : ""} ${!inMonth ? "is-other" : ""}`}>
                      {inMonth ? dayNum : dayNum <= 0 ? 30 + dayNum : dayNum - 31}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="calendar-events">
              <h4>Today</h4>
              <div className="calendar-event">
                <span className="size-2 rounded-full bg-[var(--flu-accent)] mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">No events scheduled</p>
                  <p className="text-[11px] text-[var(--muted-ink)]">Enjoy a focus day — or add a project deadline.</p>
                </div>
              </div>
              <div className="calendar-event">
                <span className="size-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Portfolio review</p>
                  <p className="text-[11px] text-[var(--muted-ink)]">You’re building it right now.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Settings */}
      <AnimatePresence>
        {quickOpen && (
          <motion.div
            className="flyout quick-flyout"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="quick-grid">
              {[
                { icon: Wifi, label: "Wi-Fi", on: true },
                { icon: Bluetooth, label: "Bluetooth", on: false },
                { icon: Plane, label: "Flight mode", on: false },
                { icon: Battery, label: "Battery saver", on: false },
                { icon: SunMedium, label: "Focus", on: false },
                { icon: SettingsIcon, label: "Accessibility", on: false },
              ].map((t) => (
                <button
                  key={t.label}
                  className={`quick-tile ${t.on ? "is-on" : ""}`}
                  onClick={() => toast.info(`${t.label} — toggled (demo)`)}
                >
                  <t.icon />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="quick-slider-row">
              <SunMedium size={16} />
              <div className="quick-slider">
                <div className="quick-slider-fill" style={{ width: "72%" }} />
                <span className="quick-slider-thumb" style={{ left: "72%" }} />
              </div>
            </div>
            <div className="quick-slider-row">
              <Volume1 size={16} />
              <div className="quick-slider">
                <div className="quick-slider-fill" style={{ width: "44%" }} />
                <span className="quick-slider-thumb" style={{ left: "44%" }} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--menu-line)]">
              <span className="text-xs flex items-center gap-2">
                <Battery size={14} /> 84% • 6h 12m remaining
              </span>
              <button className="start-more-btn" onClick={() => openApp("settings")}>
                <SettingsIcon size={12} /> Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tray expanded */}
      <AnimatePresence>
        {trayExpanded && (
          <motion.div
            className="flyout"
            style={{ bottom: "calc(var(--taskbar-h) + 8px)", right: 12, width: 280, padding: 12 }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-semibold mb-2">Hidden icons</p>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Bluetooth, label: "Bluetooth" },
                { icon: Monitor, label: "Display" },
                { icon: Bell, label: "Notifications" },
                { icon: Lock, label: "Security" },
              ].map((t) => (
                <button key={t.label} className="flex items-center gap-2 px-3 py-2 rounded bg-[var(--surface)] border border-[var(--menu-line)] text-xs" onClick={() => toast.info(`${t.label} — demo`)}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widgets Panel */}
      <AnimatePresence>
        {showWidgets && (
          <>
            <motion.div className="fixed inset-0 z-41 bg-black/10 backdrop-blur-[1px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowWidgets(false)} />
            <motion.div className="widgets-panel" initial={{ x: -24, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -24, opacity: 0 }} transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Widgets</h2>
                <button className="power-btn" onClick={() => setShowWidgets(false)}>
                  <X size={14} />
                </button>
              </div>
              <div className="widget-card">
                <h3>☀️ Kandy • 28° Mostly sunny</h3>
                <p>High 31° • Low 22° • Air quality — Moderate. Perfect for a site visit.</p>
                <div className="mt-3 flex gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded bg-[var(--flu-accent-soft)] text-[var(--flu-accent)] font-medium">Weather</span>
                  <span className="px-2 py-1 rounded bg-[var(--surface)] border border-[var(--menu-line)]">Hourly →</span>
                </div>
              </div>
              <div className="widget-card">
                <h3>📅 Today</h3>
                <p>No meetings. Deep work block — portfolio polish. You’ve got 4 windows open.</p>
                <div className="mt-3 h-20 rounded bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/30 grid place-items-center text-xs text-[var(--muted-ink)]">Calendar placeholder</div>
              </div>
              <div className="widget-card">
                <h3>📰 Build notes</h3>
                <p>“Design like an OS — details matter: 4px rhythm, 8px rounding, and a single accent.” — Win11 craft log.</p>
              </div>
              <p className="text-[11px] text-[var(--muted-ink)] text-center">Widgets are demo content — customize in Settings.</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Context Menu */}
      <AnimatePresence>
        {ctx && (
          <motion.div
            className="ctx-menu"
            style={{ left: Math.min(ctx.x, typeof window !== "undefined" ? window.innerWidth - 232 : ctx.x), top: Math.min(ctx.y, typeof window !== "undefined" ? window.innerHeight - 320 : ctx.y) }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            onClick={(e) => e.stopPropagation()}
          >
            {ctx.kind === "desktop" ? (
              <>
                <button className="ctx-item" onClick={() => { toast.info("View → Large / Medium / Small icons"); setCtx(null); }}>
                  <Eye size={14} /> View <ChevronRight size={12} style={{ marginLeft: "auto" }} />
                </button>
                <button className="ctx-item" onClick={() => { toast.info("Sort by → Name / Size / Date"); setCtx(null); }}>
                  <ArrowUpDown size={14} /> Sort by <ChevronRight size={12} style={{ marginLeft: "auto" }} />
                </button>
                <button className="ctx-item" onClick={() => { location.reload(); }}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <div className="ctx-separator" />
                <button className="ctx-item" onClick={() => { openApp("settings"); setCtx(null); }}>
                  <Palette size={14} /> Personalize
                </button>
                <button className="ctx-item" onClick={() => { openApp("settings"); setCtx(null); }}>
                  <MonitorSmartphone size={14} /> Display settings
                </button>
                <div className="ctx-separator" />
                <button className="ctx-item" onClick={() => setCtx(null)}>
                  <SettingsIcon size={14} /> Taskbar settings
                </button>
              </>
            ) : (
              <>
                <button className="ctx-item" onClick={() => { const ic = desktopIcons.find((d) => d.id === ctx.iconId); if (ic) openApp(ic.appId); setCtx(null); }}>
                  <FolderOpen size={14} /> Open
                </button>
                <button className="ctx-item" onClick={() => { toast.success("Pinned to Start"); setCtx(null); }}>
                  <Pin size={14} /> Pin to Start
                </button>
                <div className="ctx-separator" />
                <button
                  className="ctx-item"
                  onClick={() => {
                    if (ctx.iconId) {
                      setRenaming(ctx.iconId);
                      setRenameVal(iconLabels[ctx.iconId] ?? desktopIcons.find((d) => d.id === ctx.iconId)?.label ?? "");
                      setCtx(null);
                    }
                  }}
                >
                  <Edit3 size={14} /> Rename <kbd>F2</kbd>
                </button>
                <button className="ctx-item" onClick={() => { toast.info("Properties — demo"); setCtx(null); }}>
                  <SettingsIcon size={14} /> Properties
                </button>
                <div className="ctx-separator" />
                <button className="ctx-item is-disabled">
                  <Trash2 size={14} /> Delete <kbd>Del</kbd>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Taskbar Context Menu */}
      <AnimatePresence>
        {taskbarCtx && (
          <motion.div
            className="ctx-menu"
            style={{ left: Math.min(taskbarCtx.x, typeof window !== "undefined" ? window.innerWidth - 232 : taskbarCtx.x), top: Math.min(taskbarCtx.y - 80, typeof window !== "undefined" ? window.innerHeight - 120 : taskbarCtx.y) }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="ctx-item" onClick={() => { toast.info("Taskbar settings — open Settings → Personalization"); setTaskbarCtx(null); }}>
              <SettingsIcon size={14} /> Taskbar settings
            </button>
            <button className="ctx-item" onClick={() => { openApp("settings"); setTaskbarCtx(null); }}>
              <Palette size={14} /> Personalization
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrops — close flyouts */}
      {(calendarOpen || quickOpen || trayExpanded) && (
        <div
          className="fixed inset-0 z-44 bg-transparent"
          onClick={() => {
            setCalendarOpen(false);
            setQuickOpen(false);
            setTrayExpanded(false);
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ─── App Contents ─── */

function ExplorerApp() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("All");
  const tags = ["All", "Next.js", "PWA", "Design System", "Tooling"];
  const filtered = filter === "All" ? projectsData : projectsData.filter((p) => p.tags.some((t) => t.toLowerCase().includes(filter.toLowerCase())));
  return (
    <div className="explorer-layout">
      <aside className="explorer-sidebar">
        <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-ink)] px-2 mb-2">QUICK ACCESS</p>
        {[
          { icon: FolderOpen, label: "Desktop", active: true },
          { icon: Folder, label: "Documents" },
          { icon: ImageIcon, label: "Pictures" },
          { icon: Github, label: "GitHub" },
        ].map((n) => (
          <div key={n.label} className={`explorer-nav-item ${n.active ? "is-active" : ""}`}>
            <n.icon size={14} /> {n.label}
          </div>
        ))}
        <p className="text-[11px] font-semibold tracking-wide text-[var(--muted-ink)] px-2 mt-4 mb-2">TAGS</p>
        <div className="flex flex-wrap gap-1.5 px-2">
          {tags.map((t) => (
            <button key={t} onClick={() => setFilter(t)} className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${filter === t ? "bg-[var(--flu-accent)] text-white border-[var(--flu-accent)]" : "bg-[var(--surface)] border-[var(--menu-line)] hover:bg-[var(--hover-wash)]"}`}>
              {t}
            </button>
          ))}
        </div>
      </aside>
      <div className="explorer-main">
        <div className="sticky top-0 z-1 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--mica-panel)] border-b border-[var(--menu-line)] backdrop-blur">
          <div className="flex items-center gap-2 text-xs">
            <FolderOpen size={14} /> <span className="text-[var(--muted-ink)]">Desktop</span> <ChevronRight size={12} /> <span className="font-medium">Selected work</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setView("grid")} className={`p-1.5 rounded ${view === "grid" ? "bg-[var(--flu-accent-soft)] text-[var(--flu-accent)]" : "hover:bg-[var(--hover-wash)]"}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-[var(--flu-accent-soft)] text-[var(--flu-accent)]" : "hover:bg-[var(--hover-wash)]"}`}>
              <Layers size={16} />
            </button>
          </div>
        </div>

        <div className={`p-4 ${view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "grid grid-cols-1 gap-2"}`}>
          {filtered.map((p) => (
            <article
              key={p.id}
              className={`group overflow-hidden rounded-[8px] border border-[var(--menu-line)] bg-[var(--surface)] hover:shadow-md transition-all ${view === "list" ? "flex gap-4 p-3" : ""}`}
            >
              <div className={view === "grid" ? "aspect-[16/10] overflow-hidden bg-[var(--surface-container)]" : "w-28 h-20 rounded overflow-hidden shrink-0 bg-[var(--surface-container)]"}>
                <img src={p.cover} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" loading="lazy" />
              </div>
              <div className={view === "grid" ? "p-3.5" : "flex-1 min-w-0"}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-semibold leading-tight line-clamp-1">{p.title}</h3>
                  <span className="text-[10px] text-[var(--muted-ink)] shrink-0">{p.date}</span>
                </div>
                <p className="text-[11px] text-[var(--muted-ink)] mt-0.5">{p.subtitle}</p>
                <p className="text-[12px] leading-relaxed mt-2 line-clamp-2 text-[var(--on-surface)]/80">{p.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tags.map((t) => (
                    <span key={t} className="badge">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  {p.links.github && (
                    <a href={p.links.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--on-surface)] text-white text-[11px] hover:opacity-90">
                      <Github size={12} /> Code
                    </a>
                  )}
                  {p.links.live && p.links.live !== "#" && (
                    <a href={p.links.live} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[var(--menu-line)] text-[11px] hover:bg-[var(--hover-wash)]">
                      <ExternalLink size={12} /> Live
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="px-4 pb-6 pt-2 text-[11px] text-[var(--muted-ink)]">
          {filtered.length} items • <button className="underline" onClick={() => toast.info("New folder — demo")}>New folder</button>
        </div>
      </div>
    </div>
  );
}

function NotepadApp() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--menu-line)] bg-[var(--surface)] text-[12px]">
        <span className="hover:bg-[var(--hover-wash)] px-2 py-1 rounded cursor-pointer">File</span>
        <span className="hover:bg-[var(--hover-wash)] px-2 py-1 rounded cursor-pointer">Edit</span>
        <span className="hover:bg-[var(--hover-wash)] px-2 py-1 rounded cursor-pointer">View</span>
        <span className="ml-auto text-[11px] text-[var(--muted-ink)]">Ln 1, Col 1 • UTF-8 • CRLF</span>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-white dark:bg-[#1e1e1e] text-[#1b1c1c] dark:text-[#e8e8e8]">
        <div className="max-w-[720px] mx-auto">
          <p className="text-[11px] tracking-widest font-semibold text-[var(--flu-accent)] mb-3">WELCOME / START HERE</p>
          <h2 className="text-[22px] font-semibold tracking-tight mb-3" style={{ fontFamily: "Consolas, monospace" }}>
            This desktop is the starting point.
          </h2>
          <p className="text-[13px] leading-7 text-[#3a3d45] dark:text-[#c8c8cc]">
            Hey — I’m <strong>Prasad</strong>, an engineer from Kandy, LK — bridging site work and software. This portfolio is a small workspace:
            open the folder on the desktop for projects, peek at Experience for roles, or hit Contact if you want to build something together.
          </p>
          <pre className="mt-6 p-4 rounded-lg bg-[#f6f8fa] dark:bg-[#252526] border border-[var(--menu-line)] text-[12px] leading-6 overflow-x-auto">
            {`// quick links
const links = {
  github:   "github.com/prasad-kmd",
  email:    "prasad@example.com",
  location: "Kandy, Central Province, LK",
  stack:    ["Next.js", "TypeScript", "Tailwind", "PWA"],
};`}
          </pre>
          <p className="text-[12px] text-[var(--muted-ink)] mt-6">Tip: Try right-clicking the desktop, dragging windows, or hovering the Maximize button for Snap Layouts.</p>
        </div>
      </div>
    </div>
  );
}

function AboutApp() {
  return (
    <div className="app-scroll space-y-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 grid place-items-center text-white text-xl font-bold shrink-0">PM</div>
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">Prasad M.</h2>
          <p className="text-[13px] text-[var(--flu-accent)] font-medium">Site Engineer • Builder • Designer</p>
          <p className="text-[13px] leading-6 mt-2 text-[var(--muted-ink)]">From Kandy, LK. I split time between construction sites and code — designing tools that make field work lighter and portfolios that feel like workspaces.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--menu-line)] text-xs">
              <MapPin size={12} /> Kandy, LK
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--menu-line)] text-xs">
              <Calendar size={12} /> Available for work
            </span>
            <a href="https://github.com/prasad-kmd" target="_blank" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--on-surface)] text-white text-xs">
              <Github size={12} /> GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { k: "Projects shipped", v: "12+", sub: "v1 → v3 desktop" },
          { k: "Sites supported", v: "8", sub: "residential & mixed-use" },
          { k: "Design tokens", v: "40+", sub: "Fluent / Mica / Acrylic" },
        ].map((s) => (
          <div key={s.k} className="rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4">
            <div className="text-2xl font-semibold">{s.v}</div>
            <div className="text-xs font-medium">{s.k}</div>
            <div className="text-[11px] text-[var(--muted-ink)]">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "Field", icon: Building2, items: ["Site Supervision", "QA/QC", "BOQ & Costing", "AutoCAD", "MS Project"] },
          { title: "Code", icon: Code2, items: ["Next.js / React", "TypeScript", "Tailwind v4", "Motion", "Notion API", "PWA"] },
          { title: "Design", icon: Brush, items: ["Fluent / Mica", "Design Tokens", "Figma", "Prototyping", "Motion"] },
        ].map((g) => (
          <div key={g.title} className="rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <g.icon size={16} className="text-[var(--flu-accent)]" /> {g.title}
            </div>
            <ul className="space-y-1.5">
              {g.items.map((it) => (
                <li key={it} className="text-xs flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-[var(--flu-accent)]" /> {it}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-semibold mb-2">Principles</h3>
        <ul className="text-xs leading-6 text-[var(--muted-ink)] list-disc pl-5">
          <li>Details matter — 4px rhythm, 8px rounding, one accent.</li>
          <li>Build like an OS: draggable, snappable, keyboard-first.</li>
          <li>Field-tested — design for low-end devices and offline.</li>
        </ul>
      </div>
    </div>
  );
}

function ExperienceApp() {
  return (
    <div className="app-scroll">
      <div className="flex items-center gap-2 mb-6">
        <Briefcase size={16} className="text-[var(--flu-accent)]" />
        <h2 className="text-sm font-semibold">Experience & Education</h2>
        <span className="ml-auto text-[11px] text-[var(--muted-ink)]">{experience.length} entries</span>
      </div>
      <div className="relative">
        <div className="absolute left-3 top-0 bottom-0 w-px bg-[var(--menu-line)] hidden sm:block" />
        <div className="space-y-6">
          {experience.map((e) => (
            <div key={e.role} className="relative flex gap-4">
              <span className="hidden sm:grid place-items-center size-6 rounded-full bg-[var(--surface)] border border-[var(--menu-line)] text-[var(--flu-accent)] shrink-0 mt-1">
                {e.role.includes("BSc") ? <GraduationCap size={12} /> : <Building2 size={12} />}
              </span>
              <div className="flex-1 min-w-0 rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold">{e.role}</h3>
                  <span className="text-xs text-[var(--flu-accent)]">› {e.org}</span>
                  <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-[var(--flu-accent-soft)] text-[var(--flu-accent)]">{e.span}</span>
                </div>
                <p className="text-[11px] text-[var(--muted-ink)] mt-1 flex items-center gap-1">
                  <MapPin size={10} /> {e.loc}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {e.bullets.map((b, i) => (
                    <li key={i} className="text-xs leading-5 text-[var(--muted-ink)] flex gap-2">
                      <span className="mt-2 size-1 rounded-full bg-[var(--muted-ink)] shrink-0" /> <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex gap-2">
        <button onClick={() => toast.info("Download CV — add your PDF to /public and link it here")} className="px-3 py-1.5 rounded-full bg-[var(--flu-accent)] text-white text-xs font-medium inline-flex items-center gap-1.5">
          <FileText size={12} /> Download CV
        </button>
        <button onClick={() => toast.success("Copied link")} className="px-3 py-1.5 rounded-full border border-[var(--menu-line)] text-xs inline-flex items-center gap-1.5">
          <Share2 size={12} /> Share profile
        </button>
      </div>
    </div>
  );
}

function ContactApp() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  return (
    <div className="app-scroll max-w-[720px] mx-auto">
      <h2 className="text-[18px] font-semibold">Let’s build together</h2>
      <p className="text-sm text-[var(--muted-ink)] mt-1">Have a site, a product, or a portfolio idea? Drop a line — I reply within a day.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        {[
          { icon: Mail, label: "Email", value: "prasad@example.com", href: "mailto:prasad@example.com" },
          { icon: Github, label: "GitHub", value: "prasad-kmd", href: "https://github.com/prasad-kmd" },
          { icon: Linkedin, label: "LinkedIn", value: "Prasad M.", href: "#" },
        ].map((c) => (
          <a key={c.label} href={c.href} target="_blank" className="flex items-center gap-3 p-3 rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] hover:bg-[var(--hover-wash)] transition-colors">
            <span className="grid place-items-center size-9 rounded-lg bg-[var(--flu-accent-soft)] text-[var(--flu-accent)]">
              <c.icon size={16} />
            </span>
            <span>
              <span className="block text-xs font-medium">{c.label}</span>
              <span className="block text-[11px] text-[var(--muted-ink)]">{c.value}</span>
            </span>
          </a>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name || !form.email || !form.message) return toast.error("Fill in all fields");
          if (!form.email.includes("@")) return toast.error("Enter a valid email");
          setSending(true);
          setTimeout(() => {
            setSending(false);
            toast.success("Message sent — I’ll reply soon!");
            setForm({ name: "", email: "", message: "" });
          }, 900);
        }}
        className="mt-6 space-y-4 rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Name</span>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" className="w-full h-9 px-3 rounded-lg border border-[var(--menu-line)] bg-[var(--surface-container)] text-sm outline-none focus:border-[var(--flu-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--flu-accent)_20%,transparent)]" />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium">Email</span>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className="w-full h-9 px-3 rounded-lg border border-[var(--menu-line)] bg-[var(--surface-container)] text-sm outline-none focus:border-[var(--flu-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--flu-accent)_20%,transparent)]" />
          </label>
        </div>
        <label className="space-y-1.5 block">
          <span className="text-xs font-medium">Message</span>
          <textarea value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} placeholder="What would you like to build?" rows={4} className="w-full px-3 py-2.5 rounded-lg border border-[var(--menu-line)] bg-[var(--surface-container)] text-sm outline-none focus:border-[var(--flu-accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--flu-accent)_20%,transparent)] resize-none" />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--muted-ink)]">Press Enter to send • Esc to close</span>
          <button type="submit" disabled={sending} className="px-4 py-2 rounded-full bg-[var(--flu-accent)] text-white text-xs font-medium disabled:opacity-60 inline-flex items-center gap-1.5">
            {sending ? "Sending…" : "Send message"} <Mail size={12} />
          </button>
        </div>
      </form>

      <p className="text-[11px] text-[var(--muted-ink)] mt-4 text-center">Prefer chat? I’m usually on GitHub — open an issue or discussion.</p>
    </div>
  );
}

function SettingsApp({ theme, setTheme, wallpaper, setWallpaper, accent, setAccent }: { theme: Theme; setTheme: (t: Theme) => void; wallpaper: Wallpaper; setWallpaper: (w: Wallpaper) => void; accent: string; setAccent: (a: string) => void }) {
  return (
    <div className="app-scroll max-w-[720px] mx-auto space-y-6">
      <div>
        <h2 className="text-[18px] font-semibold flex items-center gap-2">
          <SettingsIcon size={18} className="text-[var(--flu-accent)]" /> Settings
        </h2>
        <p className="text-sm text-[var(--muted-ink)]">Personalize your desktop — theme, wallpaper, and accent.</p>
      </div>

      <section className="rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--menu-line)] flex items-center gap-2">
          <Palette size={14} className="text-[var(--flu-accent)]" />
          <h3 className="text-sm font-semibold">Appearance</h3>
        </div>
        <div className="p-4 space-y-5">
          <div>
            <p className="text-xs font-medium mb-2">Theme</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "light" as Theme, label: "Light", desc: "Bright surfaces, soft shadows", icon: Sun },
                { id: "dark" as Theme, label: "Dark", desc: "Obsidian slate, vibrant accent", icon: Moon },
              ].map((t) => (
                <button key={t.id} onClick={() => setTheme(t.id)} className={`p-3 rounded-xl border text-left flex gap-3 items-center transition-colors ${theme === t.id ? "bg-[var(--flu-accent-soft)] border-[var(--flu-accent)]" : "bg-[var(--surface-container)] border-[var(--menu-line)] hover:bg-[var(--hover-wash)]"}`}>
                  <span className={`grid place-items-center size-10 rounded-lg ${theme === t.id ? "bg-[var(--flu-accent)] text-white" : "bg-[var(--surface)] border border-[var(--menu-line)]"}`}>
                    <t.icon size={16} />
                  </span>
                  <span>
                    <span className="block text-xs font-semibold">{t.label}</span>
                    <span className="block text-[11px] text-[var(--muted-ink)]">{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {["#0067c0", "#0f6cbd", "#8764b8", "#d83b01", "#107c10", "#e3008c", "#4cc2ff"].map((c) => (
                <button key={c} onClick={() => setAccent(c)} className={`size-8 rounded-full border-2 transition-transform hover:scale-105 ${accent === c ? "border-[var(--on-surface)] scale-110" : "border-white dark:border-[var(--menu-line)]"}`} style={{ background: c }} aria-label={c} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-2">Wallpaper</p>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(WALLPAPERS) as Wallpaper[]).map((w) => (
                <button key={w} onClick={() => setWallpaper(w)} className={`group relative overflow-hidden rounded-xl border-2 aspect-[16/10] ${wallpaper === w ? "border-[var(--flu-accent)]" : "border-[var(--menu-line)] hover:border-[var(--outline-variant)]"}`}>
                  <img src={WALLPAPERS[w].src} alt={WALLPAPERS[w].label} className="w-full h-full object-cover" />
                  <span className={`absolute inset-x-0 bottom-0 px-2 py-1.5 text-[11px] font-medium backdrop-blur text-white ${wallpaper === w ? "bg-[var(--flu-accent)]" : "bg-black/40 group-hover:bg-black/50"}`}>{WALLPAPERS[w].label}</span>
                  {wallpaper === w && <span className="absolute top-2 right-2 size-5 rounded-full bg-[var(--flu-accent)] grid place-items-center text-white">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Monitor size={14} className="text-[var(--flu-accent)]" /> About this desktop
        </h3>
        <p className="text-xs text-[var(--muted-ink)] leading-5 mt-2">Windows 11-inspired portfolio shell — Mica titlebars, Acrylic taskbar & flyouts, Fluent motion. Built with Next.js 16 + Tailwind v4 + Base UI + Motion. No tracking, no cookies — just craft.</p>
        <div className="mt-3 flex gap-2">
          <span className="badge">v3.1.0</span>
          <span className="badge">Fluent</span>
          <span className="badge">Mica / Acrylic</span>
        </div>
      </section>
    </div>
  );
}

function BrowserApp() {
  const links = [
    { title: "GitHub — prasad-kmd", url: "https://github.com/prasad-kmd", desc: "Repos, stars, and contributions", icon: Github },
    { title: "PM Web v3", url: "https://github.com/prasad-kmd/pm-web_v3", desc: "This portfolio — source code", icon: Globe },
    { title: "PMEngineer.lk (v1)", url: "https://github.com/prasad-kmd/PMEngineerLK-NextJS", desc: "First-gen field platform", icon: Building2 },
    { title: "LinkedIn", url: "#", desc: "Professional profile", icon: Linkedin },
  ];
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--menu-line)] bg-[var(--surface)]">
        <div className="flex gap-1">
          <span className="size-3 rounded-full bg-[#ff5f56]" />
          <span className="size-3 rounded-full bg-[#ffbd2e]" />
          <span className="size-3 rounded-full bg-[#27c93f]" />
        </div>
        <div className="flex-1 mx-3 flex items-center gap-2 h-7 px-3 rounded-full bg-[var(--surface-container)] border border-[var(--menu-line)] text-xs text-[var(--muted-ink)]">
          <Globe size={12} /> https://prasad-kmd — workspace
        </div>
        <button className="p-1.5 rounded hover:bg-[var(--hover-wash)]" onClick={() => toast.info("Refresh — demo")}>
          <RotateCcw size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <h2 className="text-sm font-semibold mb-1">Quick links</h2>
        <p className="text-xs text-[var(--muted-ink)] mb-4">External destinations — opens in a new tab.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((l) => (
            <a key={l.title} href={l.url} target="_blank" rel="noreferrer" className="flex gap-3 p-4 rounded-xl border border-[var(--menu-line)] bg-[var(--surface)] hover:border-[var(--flu-accent)] hover:shadow-sm transition-all">
              <span className="grid place-items-center size-10 rounded-lg bg-[var(--flu-accent-soft)] text-[var(--flu-accent)] shrink-0">
                <l.icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium line-clamp-1">{l.title}</span>
                <span className="block text-xs text-[var(--muted-ink)] line-clamp-1">{l.desc}</span>
                <span className="block text-[11px] text-[var(--flu-accent)] mt-1 inline-flex items-center gap-1">
                  Open <ExternalLink size={10} />
                </span>
              </span>
            </a>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-[var(--flu-accent-soft)] border border-[var(--flu-accent)]/20">
          <p className="text-xs font-medium">Tip</p>
          <p className="text-xs text-[var(--muted-ink)] mt-1">Add more links by editing <code className="px-1 py-0.5 rounded bg-white dark:bg-black/20 text-[11px]">BrowserApp</code> in <code className="px-1 py-0.5 rounded bg-white dark:bg-black/20 text-[11px]">app/page.tsx</code>.</p>
        </div>
      </div>
    </div>
  );
}
