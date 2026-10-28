import {
  contactLinks,
  education,
  experience,
  interests,
  languages,
  personalDetails,
  resumeProfile,
  selectedProjects,
} from "@/lib/resume-data";

/**
 * A minimal, dependency-free PDF writer for the résumé.
 *
 * The alternative — a headless browser or a PDF library — is either impossible
 * in a serverless route or adds a few hundred kilobytes for one document. This
 * emits the subset of PDF 1.4 that matters here: the base-14 Helvetica faces
 * (no embedding), one content stream per page, WinAnsi text, and a correct
 * cross-reference table.
 *
 * Everything is laid out from `lib/resume-data.ts`, so editing that file changes
 * the download. The layout is deliberately plain: it is a document to be
 * printed, signed and re-edited, not a screenshot of the app.
 */

const A4 = { width: 595.28, height: 841.89 };
const MARGIN = 48;
const CONTENT_WIDTH = A4.width - MARGIN * 2;

/** Helvetica advance widths for ASCII 32–126, in 1/1000 em. */
const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

/** Rough width of a string in points. Bold is a little wider than regular. */
function textWidth(text: string, size: number, bold = false): number {
  let total = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    total +=
      code >= 32 && code <= 126 ? HELVETICA[code - 32] : code > 126 ? 556 : 278;
  }
  return (total / 1000) * size * (bold ? 1.045 : 1);
}

/** Greedy wrap on words, with a hard break for anything longer than a line. */
function wrap(
  text: string,
  size: number,
  width: number,
  bold = false,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (textWidth(word, size, bold) > width) {
      let chunk = "";
      for (const char of word) {
        if (textWidth(chunk + char, size, bold) > width) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Map the typographic punctuation in the data onto WinAnsi-safe characters. */
function ascii(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[\u00b7\u2022]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/[^\x20-\x7e]/g, "");
}

function escape(text: string): string {
  return ascii(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

type Op = string;

class Page {
  ops: Op[] = [];
  y = A4.height - MARGIN;

  remaining(): number {
    return this.y - MARGIN;
  }

  /** Draws one line of text at the current cursor and advances the cursor. */
  text(
    value: string,
    {
      size = 9.5,
      bold = false,
      italic = false,
      color = 0.16,
      leading = 1.42,
      x = MARGIN,
      advance = true,
    }: {
      size?: number;
      bold?: boolean;
      italic?: boolean;
      color?: number;
      leading?: number;
      x?: number;
      advance?: boolean;
    } = {},
  ): void {
    const font = bold ? "/F2" : italic ? "/F3" : "/F1";
    this.ops.push(
      `BT ${font} ${size} Tf ${color} ${color} ${color} rg 1 0 0 1 ${x.toFixed(2)} ${this.y.toFixed(2)} Tm (${escape(value)}) Tj ET`,
    );
    if (advance) this.y -= size * leading;
  }

  /** Runs of styled text on one baseline: `[["Reg.", false], [" 2024", true]]`. */
  run(
    parts: Array<[string, boolean]>,
    {
      size = 9.5,
      color = 0.16,
      x = MARGIN,
      leading = 1.42,
    }: { size?: number; color?: number; x?: number; leading?: number } = {},
  ): void {
    let cursor = x;
    for (const [value, bold] of parts) {
      this.ops.push(
        `BT ${bold ? "/F2" : "/F1"} ${size} Tf ${color} ${color} ${color} rg 1 0 0 1 ${cursor.toFixed(2)} ${this.y.toFixed(2)} Tm (${escape(value)}) Tj ET`,
      );
      cursor += textWidth(value, size, bold);
    }
    this.y -= size * leading;
  }

  rule(color = 0.86): void {
    this.ops.push(
      `0.5 w ${color} ${color} ${color} RG ${MARGIN.toFixed(2)} ${this.y.toFixed(2)} m ${(A4.width - MARGIN).toFixed(2)} ${this.y.toFixed(2)} l S`,
    );
    this.y -= 12;
  }

  space(points: number): void {
    this.y -= points;
  }
}

type Section = { title: string };

function heading(page: Page, title: string): void {
  page.space(9);
  page.text(title.toUpperCase(), { size: 8, bold: true, color: 0.42 });
  page.rule();
  page.space(2);
}

/** Wraps and draws a paragraph, breaking to a new page when it runs out. */
function paragraph(
  pages: Page[],
  value: string,
  { size = 9.5, color = 0.28, indent = 0 } = {},
): void {
  const width = CONTENT_WIDTH - indent;
  for (const line of wrap(value, size, width)) {
    let page = pages[pages.length - 1];
    if (page.remaining() < size * 1.42) {
      page = newPage(pages);
    }
    page.text(line, { size, color, x: MARGIN + indent });
  }
}

/** Truncates to the longest prefix that fits `width`, with an ellipsis. */
function fit(text: string, size: number, width: number): string {
  if (textWidth(text, size) <= width) return text;
  let out = text;
  while (out.length > 1 && textWidth(`${out}...`, size) > width) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}...`;
}

function newPage(pages: Page[]): Page {
  const page = new Page();
  pages.push(page);
  return page;
}

export type ResumePdfProject = {
  title: string;
  summary: string;
  meta: string;
};

/** Builds the résumé PDF and returns its bytes. */
export function buildResumePdf(
  projects: ResumePdfProject[] = selectedProjects.map((project) => ({
    title: project.title,
    summary: project.summary,
    meta: [
      project.category,
      project.readTime ? `${project.readTime} min read` : "",
    ]
      .filter(Boolean)
      .join("  |  "),
  })),
): Uint8Array {
  const pages: Page[] = [];
  const page = newPage(pages);

  // --- Masthead -------------------------------------------------------------
  page.text(resumeProfile.name, {
    size: 24,
    bold: true,
    color: 0.09,
    leading: 1.2,
  });
  page.text(resumeProfile.role, { size: 11, color: 0.35, leading: 1.5 });
  page.space(2);
  page.text(
    `${resumeProfile.location}  |  ${resumeProfile.timezone}  |  ${resumeProfile.availability}`,
    { size: 9, color: 0.42 },
  );
  page.text(
    contactLinks
      .map((link) =>
        link.href.startsWith("/")
          ? link.href.replace(/^\//, "prasadk.dev/")
          : link.href.replace(/^https?:\/\/(www\.)?/, ""),
      )
      .join("   "),
    { size: 9, color: 0.42 },
  );
  page.space(4);
  page.rule(0.78);
  page.space(2);

  paragraph(pages, resumeProfile.summary, { size: 10, color: 0.24 });

  // --- Projects -------------------------------------------------------------
  heading(pages[pages.length - 1], "Selected projects");
  for (const project of projects) {
    const current = pages[pages.length - 1];
    if (current.remaining() < 56) newPage(pages);
    const target = pages[pages.length - 1];
    target.text(project.title, {
      size: 10,
      bold: true,
      color: 0.12,
      leading: 1.35,
    });
    if (project.meta) {
      target.text(project.meta, { size: 8.5, color: 0.45, leading: 1.4 });
    }
    paragraph(pages, project.summary, { size: 9, color: 0.3 });
    pages[pages.length - 1].space(5);
  }

  // --- Experience -----------------------------------------------------------
  heading(pages[pages.length - 1], "Experience");
  for (const role of experience) {
    if (pages[pages.length - 1].remaining() < 72) newPage(pages);
    const target = pages[pages.length - 1];
    target.run(
      [
        [role.role, true],
        [`    ${role.period}`, false],
      ],
      { size: 10, color: 0.12, leading: 1.4 },
    );
    target.text(`${role.org} - ${role.location}`, {
      size: 8.5,
      color: 0.45,
      leading: 1.45,
    });
    paragraph(pages, role.summary, { size: 9, color: 0.3 });
    for (const point of role.points) {
      paragraph(pages, `- ${point}`, { size: 9, color: 0.36 });
    }
    pages[pages.length - 1].space(6);
  }

  // --- Education ------------------------------------------------------------
  heading(pages[pages.length - 1], "Education");
  for (const entry of education) {
    if (pages[pages.length - 1].remaining() < 56) newPage(pages);
    const target = pages[pages.length - 1];
    target.text(entry.credential, {
      size: 9.5,
      bold: true,
      color: 0.12,
      leading: 1.35,
    });
    target.text(`${entry.institution} - ${entry.location} - ${entry.period}`, {
      size: 8.5,
      color: 0.45,
      leading: 1.45,
    });
    page_note(pages, entry.note);
    pages[pages.length - 1].space(5);
  }

  // --- Two-column footer block ---------------------------------------------
  const leftLines = [
    ...personalDetails
      .filter((detail) => detail.label !== "Name" && detail.label !== "Role")
      .map((detail) => `${detail.label}: ${detail.value}`),
    ...languages.map(
      (language) => `Language: ${language.name} - ${language.level}`,
    ),
  ];
  const rightLines = interests.map((interest) => `- ${interest}`);
  const rows = Math.max(leftLines.length, rightLines.length);

  // Keep the heading with at least three rows of its block.
  if (pages[pages.length - 1].remaining() < 40 + Math.min(rows, 3) * 13 + 40) {
    newPage(pages);
  }
  heading(pages[pages.length - 1], "Details");

  const rightColumn = MARGIN + CONTENT_WIDTH / 2 + 6;
  const columnWidth = CONTENT_WIDTH / 2 - 12;

  for (let index = 0; index < rows; index++) {
    if (pages[pages.length - 1].remaining() < 18) newPage(pages);
    const target = pages[pages.length - 1];
    const baseline = target.y;
    const left = leftLines[index];
    const right = rightLines[index];
    if (left) {
      target.y = baseline;
      target.text(fit(left, 9, columnWidth), {
        size: 9,
        color: 0.3,
        x: MARGIN,
        advance: false,
      });
    }
    if (right) {
      target.y = baseline;
      target.text(fit(right, 9, columnWidth), {
        size: 9,
        color: 0.3,
        x: rightColumn,
        advance: false,
      });
    }
    target.y = baseline - 13;
  }

  // --- Colophon -------------------------------------------------------------
  const foot = pages[pages.length - 1];
  foot.space(10);
  foot.rule(0.9);
  foot.text(
    `Generated from ${resumeProfile.name}'s portfolio on ${new Date()
      .toISOString()
      .slice(0, 10)}. Edit lib/resume-data.ts and re-download to update.`,
    { size: 8, color: 0.52 },
  );

  return serialize(pages);
}

/** Small italic note under an education entry. */
function page_note(pages: Page[], note: string): void {
  for (const line of wrap(note, 8.5, CONTENT_WIDTH)) {
    const page = pages[pages.length - 1];
    if (page.remaining() < 14) return;
    page.text(line, { size: 8.5, italic: true, color: 0.5 });
  }
}

/* -------------------------------------------------------------------------- */
/* Serialisation                                                              */
/* -------------------------------------------------------------------------- */

function objectBody(index: number, pages: Page[]): string {
  // 1 catalog, 2 pages, 3–5 the three Helvetica faces; page objects follow.
  const firstPage = 6;

  if (index === 1) return "<< /Type /Catalog /Pages 2 0 R >>";
  if (index === 2) {
    const kids = pages
      .map((_, offset) => `${firstPage + offset * 2} 0 R`)
      .join(" ");
    return `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`;
  }
  if (index === 3) {
    return "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  }
  if (index === 4) {
    return "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  }
  if (index === 5) {
    return "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>";
  }

  const pageIndex = Math.floor((index - firstPage) / 2);
  const isPage = (index - firstPage) % 2 === 0;
  const page = pages[pageIndex];

  if (isPage) {
    const contentId = index + 1;
    return `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentId} 0 R >>`;
  }

  const stream = page.ops.join("\n");
  return `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`;
}

function serialize(pages: Page[]): Uint8Array {
  const total = 5 + pages.length * 2;
  const chunks: Buffer[] = [];
  const offsets: number[] = [];
  let cursor = 0;

  const push = (value: string) => {
    const buffer = Buffer.from(value, "latin1");
    chunks.push(buffer);
    cursor += buffer.length;
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  for (let index = 1; index <= total; index++) {
    offsets[index] = cursor;
    push(`${index} 0 obj\n${objectBody(index, pages)}\nendobj\n`);
  }

  const xref = cursor;
  push(`xref\n0 ${total + 1}\n0000000000 65535 f \n`);
  for (let index = 1; index <= total; index++) {
    push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`,
  );

  return new Uint8Array(Buffer.concat(chunks));
}
