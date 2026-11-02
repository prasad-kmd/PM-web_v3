/**
 * Pure line-diff logic for the Tool Bench.
 *
 * v1 defect fixed: a 10-line look-ahead loop guessed insertions and deletions
 * and produced wrong results for moved or distant blocks. This is a real LCS
 * (longest common subsequence) diff with deterministic tie-breaking, CRLF
 * normalisation and explicit size caps so a large paste cannot freeze the UI.
 */

export type DiffOperationType = "added" | "removed" | "unchanged";

export type DiffOperation = {
  type: DiffOperationType;
  text: string;
  leftNumber?: number;
  rightNumber?: number;
};

export type DiffRow = {
  type: "added" | "removed" | "unchanged" | "changed";
  left?: { number: number; text: string };
  right?: { number: number; text: string };
};

export type DiffStats = {
  added: number;
  removed: number;
  unchanged: number;
};

export type DiffResult = {
  rows: DiffRow[];
  stats: DiffStats;
  identical: boolean;
  truncated: boolean;
  lineLimit: number;
};

export const MAX_DIFF_LINES = 1000;
export const MAX_DIFF_CHARS = 200_000;

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function splitLines(text: string): string[] {
  const normalized = normalizeLineEndings(text);
  return normalized.length === 0 ? [] : normalized.split("\n");
}

function clampLines(lines: string[]): { lines: string[]; truncated: boolean } {
  if (lines.length <= MAX_DIFF_LINES) return { lines, truncated: false };
  return { lines: lines.slice(0, MAX_DIFF_LINES), truncated: true };
}

function buildOperations(left: string[], right: string[]): DiffOperation[] {
  const n = left.length;
  const m = right.length;
  const width = m + 1;
  const table = new Uint32Array((n + 1) * width);

  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const current = i * width + j;
      if (left[i] === right[j]) {
        table[current] = table[(i + 1) * width + (j + 1)] + 1;
      } else {
        table[current] = Math.max(
          table[(i + 1) * width + j],
          table[i * width + (j + 1)],
        );
      }
    }
  }

  const operations: DiffOperation[] = [];
  let i = 0;
  let j = 0;
  let leftNumber = 1;
  let rightNumber = 1;

  while (i < n && j < m) {
    if (left[i] === right[j]) {
      operations.push({
        type: "unchanged",
        text: left[i],
        leftNumber: leftNumber++,
        rightNumber: rightNumber++,
      });
      i += 1;
      j += 1;
    } else if (table[(i + 1) * width + j] >= table[i * width + (j + 1)]) {
      operations.push({
        type: "removed",
        text: left[i],
        leftNumber: leftNumber++,
      });
      i += 1;
    } else {
      operations.push({
        type: "added",
        text: right[j],
        rightNumber: rightNumber++,
      });
      j += 1;
    }
  }

  while (i < n) {
    operations.push({
      type: "removed",
      text: left[i],
      leftNumber: leftNumber++,
    });
    i += 1;
  }
  while (j < m) {
    operations.push({
      type: "added",
      text: right[j],
      rightNumber: rightNumber++,
    });
    j += 1;
  }

  return operations;
}

function groupOperations(operations: DiffOperation[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let cursor = 0;

  while (cursor < operations.length) {
    const operation = operations[cursor];
    if (operation.type === "unchanged") {
      rows.push({
        type: "unchanged",
        left: { number: operation.leftNumber ?? 0, text: operation.text },
        right: { number: operation.rightNumber ?? 0, text: operation.text },
      });
      cursor += 1;
      continue;
    }

    const removed: DiffOperation[] = [];
    const added: DiffOperation[] = [];
    while (
      cursor < operations.length &&
      operations[cursor].type !== "unchanged"
    ) {
      const candidate = operations[cursor];
      if (candidate.type === "removed") removed.push(candidate);
      else if (candidate.type === "added") added.push(candidate);
      cursor += 1;
    }

    const pairCount = Math.max(removed.length, added.length);
    for (let index = 0; index < pairCount; index += 1) {
      const left = removed[index];
      const right = added[index];
      rows.push({
        type: left && right ? "changed" : left ? "removed" : "added",
        left: left
          ? { number: left.leftNumber ?? 0, text: left.text }
          : undefined,
        right: right
          ? { number: right.rightNumber ?? 0, text: right.text }
          : undefined,
      });
    }
  }

  return rows;
}

export function computeLineDiff(
  originalText: string,
  modifiedText: string,
): DiffResult {
  if (
    originalText.length > MAX_DIFF_CHARS ||
    modifiedText.length > MAX_DIFF_CHARS
  ) {
    return {
      rows: [],
      stats: { added: 0, removed: 0, unchanged: 0 },
      identical: false,
      truncated: true,
      lineLimit: MAX_DIFF_LINES,
    };
  }

  const leftClamp = clampLines(splitLines(originalText));
  const rightClamp = clampLines(splitLines(modifiedText));
  const truncated = leftClamp.truncated || rightClamp.truncated;

  if (
    !truncated &&
    leftClamp.lines.length === rightClamp.lines.length &&
    leftClamp.lines.every((line, index) => line === rightClamp.lines[index])
  ) {
    const rows: DiffRow[] = leftClamp.lines.map((line, index) => ({
      type: "unchanged",
      left: { number: index + 1, text: line },
      right: { number: index + 1, text: line },
    }));
    return {
      rows,
      stats: { added: 0, removed: 0, unchanged: rows.length },
      identical: true,
      truncated: false,
      lineLimit: MAX_DIFF_LINES,
    };
  }

  const operations = buildOperations(leftClamp.lines, rightClamp.lines);
  const stats: DiffStats = { added: 0, removed: 0, unchanged: 0 };
  for (const operation of operations) stats[operation.type] += 1;

  return {
    rows: groupOperations(operations),
    stats,
    identical: false,
    truncated,
    lineLimit: MAX_DIFF_LINES,
  };
}
