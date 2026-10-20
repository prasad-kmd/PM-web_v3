/* Portfolio content — edit to match your real work */
export type Project = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  cover: string;
  links: { github?: string; live?: string };
  date: string;
};

export const projects: Project[] = [
  {
    id: "pm-engine",
    title: "PMEngineer.lk — Field Platform",
    subtitle: "Civil engineering toolkit for site workflows",
    description:
      "A field-first web platform for quantity surveying, scheduling, and on-site documentation. Built with Next.js and a mobile-optimized design system.",
    tags: ["Next.js", "TypeScript", "Tailwind"],
    cover: "https://picsum.photos/seed/pmeng/640/360",
    links: { github: "https://github.com/prasad-kmd", live: "#" },
    date: "2024 — Present",
  },
  {
    id: "win-portfolio",
    title: "PM Web v3 — Desktop Portfolio",
    subtitle: "Windows 11-inspired personal workspace",
    description:
      "This site — a desktop metaphor with Mica/Acrylic materials, window management, and Fluent motion. Designed to feel like an OS, built as a portfolio.",
    tags: ["Next.js 16", "Mica/Acrylic", "Motion"],
    cover: "https://picsum.photos/seed/pmweb/640/360",
    links: { github: "https://github.com/prasad-kmd/pm-web_v3" },
    date: "2025 — 2026",
  },
  {
    id: "notion-sync",
    title: "Notion → Portfolio Sync",
    subtitle: "Headless CMS for case studies",
    description:
      "A sync pipeline that pulls structured content from Notion and renders rich case studies with cover images, embeds, and code blocks.",
    tags: ["Notion API", "Next.js", "ISR"],
    cover: "https://picsum.photos/seed/notion/640/360",
    links: { github: "https://github.com/prasad-kmd" },
    date: "2024",
  },
  {
    id: "qs-tools",
    title: "Quantity Surveying Tools",
    subtitle: "Interactive estimators & converters",
    description:
      "A suite of calculators for bar-bending schedules, concrete mixes, and cost estimation — used daily by site teams.",
    tags: ["React", "Math", "PWA"],
    cover: "https://picsum.photos/seed/qs/640/360",
    links: { live: "#" },
    date: "2023 — 2024",
  },
  {
    id: "workbench",
    title: "Workbench — Design System",
    subtitle: "Fluent-inspired component library",
    description:
      "A private component kit exploring Mica, Acrylic, and WinUI tokens in React. Includes window chrome, flyouts, and motion primitives.",
    tags: ["Design System", "Base UI", "Tokens"],
    cover: "https://picsum.photos/seed/workbench/640/360",
    links: { github: "https://github.com/prasad-kmd" },
    date: "2025",
  },
  {
    id: "field-notes",
    title: "Field Notes — Offline Capture",
    subtitle: "PWA for site inspections",
    description:
      "Offline-first capture for site photos, voice notes, and checklists. Syncs when back online. Tested on low-end Android devices.",
    tags: ["PWA", "Offline", "Camera API"],
    cover: "https://picsum.photos/seed/field/640/360",
    links: { live: "#" },
    date: "2023",
  },
];

export const experience = [
  {
    role: "Site Engineer",
    org: "Independent / Contract",
    span: "2023 — Present",
    loc: "Kandy, LK",
    bullets: [
      "Leading site execution for residential and mixed-use projects — setting out, QA/QC, and progress tracking.",
      "Built internal tools for BOQ, scheduling, and daily reporting — cut manual paperwork by ~40%.",
      "Bridging field and codebase: designing the PMEngineer.lk platform from site needs.",
    ],
  },
  {
    role: "Engineering Portfolio — Builder",
    org: "Personal Lab",
    span: "2021 — Present",
    loc: "Remote",
    bullets: [
      "Shipped three portfolio generations (v1 NextJS, v2 refined, v3 Win11 desktop) — each a design and engineering exercise.",
      "Exploring human-centered tooling for construction — calculators, PWA capture, and Notion-backed publishing.",
    ],
  },
  {
    role: "BSc (Hons) Civil Engineering",
    org: "University",
    span: "2018 — 2022",
    loc: "Sri Lanka",
    bullets: ["Graduated with focus on structural and construction management."],
  },
];

export const skills = {
  field: ["Site Supervision", "QA/QC", "BOQ & Costing", "AutoCAD", "MS Project"],
  code: ["Next.js / React", "TypeScript", "Tailwind CSS v4", "Motion", "Notion API", "PWA"],
  design: ["Fluent / Mica / Acrylic", "Design Tokens", "Prototyping", "Figma"],
};
