/**
 * Stream-compressor helpers.
 *
 * v1 used `@ts-expect-error` to hide the missing CompressionStream types and
 * did not feature-detect the API; unsupported browsers got a generic failure.
 * This module uses an explicit structural type, detects support before any work,
 * and returns a readable error instead of guessing.
 */

export type CompressionFormat = "gzip" | "deflate" | "deflate-raw";
export type CompressionDirection = "compress" | "decompress";

export const COMPRESSION_FORMATS: readonly {
  value: CompressionFormat;
  label: string;
  extension: string;
}[] = [
  { value: "gzip", label: "Gzip", extension: "gz" },
  { value: "deflate", label: "Deflate", extension: "deflate" },
  { value: "deflate-raw", label: "Deflate (raw)", extension: "raw" },
] as const;

type CompressionStreamCtor = new (
  format: string,
) => ReadableWritablePair<Uint8Array, Uint8Array>;

type StreamGlobals = {
  CompressionStream?: CompressionStreamCtor;
  DecompressionStream?: CompressionStreamCtor;
};

export type StreamSupport = {
  streams: boolean;
  compression: boolean;
  decompression: boolean;
};

export function getStreamSupport(): StreamSupport {
  const globals = globalThis as unknown as StreamGlobals;
  const streams =
    typeof Blob !== "undefined" &&
    typeof Response !== "undefined" &&
    typeof ReadableStream !== "undefined";
  return {
    streams,
    compression: streams && typeof globals.CompressionStream === "function",
    decompression: streams && typeof globals.DecompressionStream === "function",
  };
}

export type CompressionGate = { ok: true } | { ok: false; error: string };

export function canUseCompression(
  direction: CompressionDirection,
  format: CompressionFormat,
): CompressionGate {
  if (!COMPRESSION_FORMATS.some((entry) => entry.value === format)) {
    return { ok: false, error: "Unsupported compression format." };
  }
  const support = getStreamSupport();
  if (!support.streams) {
    return {
      ok: false,
      error: "Streaming file APIs are unavailable in this browser.",
    };
  }
  if (direction === "compress" && !support.compression) {
    return {
      ok: false,
      error: "CompressionStream is not supported in this browser.",
    };
  }
  if (direction === "decompress" && !support.decompression) {
    return {
      ok: false,
      error: "DecompressionStream is not supported in this browser.",
    };
  }
  return { ok: true };
}

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${Number(value.toFixed(decimals))} ${units[index]}`;
}

export function compressionSavings(
  originalSize: number,
  resultSize: number,
): { ratio: number; savedPercent: number; label: string } | null {
  if (
    !Number.isFinite(originalSize) ||
    !Number.isFinite(resultSize) ||
    originalSize <= 0 ||
    resultSize < 0
  ) {
    return null;
  }
  const ratio = resultSize / originalSize;
  const savedPercent = (1 - ratio) * 100;
  const verb = savedPercent >= 0 ? "Saved" : "Expanded";
  return {
    ratio,
    savedPercent,
    label: `${verb} ${Math.abs(savedPercent).toFixed(1)}%`,
  };
}

export function resultFileName(
  fileName: string,
  format: CompressionFormat,
  direction: CompressionDirection,
): string {
  const entry = COMPRESSION_FORMATS.find((item) => item.value === format);
  if (!entry) return `${fileName}.out`;
  if (direction === "compress") {
    return `${fileName}.${entry.extension}`;
  }
  const suffix = `.${entry.extension}`;
  if (fileName.toLowerCase().endsWith(suffix)) {
    return fileName.slice(0, -suffix.length);
  }
  return `${fileName}.out`;
}

export type TransformResult =
  { ok: true; blob: Blob } | { ok: false; error: string };

export async function transformBlob(
  blob: Blob,
  format: CompressionFormat,
  direction: CompressionDirection,
): Promise<TransformResult> {
  const gate = canUseCompression(direction, format);
  if (!gate.ok) return gate;
  if (typeof blob?.stream !== "function") {
    return { ok: false, error: "This file cannot be streamed." };
  }
  try {
    const globals = globalThis as unknown as StreamGlobals;
    const Ctor =
      direction === "compress"
        ? globals.CompressionStream
        : globals.DecompressionStream;
    if (!Ctor) {
      return {
        ok: false,
        error: "The required stream constructor is unavailable.",
      };
    }
    const transformer = new Ctor(format);
    const stream = blob.stream().pipeThrough(transformer);
    const response = new Response(stream as unknown as BodyInit);
    const result = await response.blob();
    return { ok: true, blob: result };
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message
        : "The stream could not be processed.";
    return {
      ok: false,
      error:
        direction === "decompress"
          ? `Decompression failed. Check that the file matches the selected format. ${detail}`
          : `Compression failed. ${detail}`,
    };
  }
}
