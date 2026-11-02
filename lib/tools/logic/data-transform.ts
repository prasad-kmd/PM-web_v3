/**
 * Pure, UTF-8-safe data transformation logic for the Tool Bench.
 *
 * v1 defects fixed:
 * - `btoa`/`atob` were called directly on JS strings, which throws on any
 *   non-Latin-1 character (emoji, Sinhala, accented letters).
 * - Hex/binary encoding used `charCodeAt(0)`, which breaks surrogate pairs.
 * - Binary had no decode path at all.
 *
 * Every codec now goes through `TextEncoder` / `TextDecoder`, so Unicode and
 * emoji round-trip exactly. Invalid UTF-8 is rejected with `fatal: true`.
 */

export type TransformMode = "base64" | "url" | "hex" | "binary";
export type TransformDirection = "encode" | "decode";
export type TransformResult =
  { ok: true; output: string } | { ok: false; error: string };

export const TRANSFORM_MODES: readonly {
  value: TransformMode;
  label: string;
}[] = [
  { value: "base64", label: "Base64" },
  { value: "url", label: "URL" },
  { value: "hex", label: "Hex" },
  { value: "binary", label: "Binary" },
];

export const MAX_TRANSFORM_LENGTH = 200_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function bytesToBinaryString(bytes: Uint8Array): string {
  let output = "";
  const chunkSize = 0x2000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    output += String.fromCharCode(...chunk);
  }
  return output;
}

function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return decoder.decode(bytes);
  } catch {
    throw new Error("Decoded bytes are not valid UTF-8 text.");
  }
}

function base64Encode(input: string): string {
  return btoa(bytesToBinaryString(encoder.encode(input)));
}

function base64Decode(input: string): string {
  const cleaned = input
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  if (!cleaned) return "";
  if (cleaned.length % 4 === 1) {
    throw new Error("Base64 input has an invalid length.");
  }
  const padded = cleaned.padEnd(Math.ceil(cleaned.length / 4) * 4, "=");
  return decodeUtf8(binaryStringToBytes(atob(padded)));
}

function urlEncode(input: string): string {
  return encodeURIComponent(input);
}

function urlDecode(input: string): string {
  return decodeURIComponent(input.replace(/\+/g, " "));
}

function hexEncode(input: string): string {
  return Array.from(encoder.encode(input), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join(" ");
}

function hexDecode(input: string): string {
  const cleaned = input.replace(/0x/gi, "").replace(/[\s,_-]/g, "");
  if (!cleaned) return "";
  if (!/^[0-9a-f]+$/i.test(cleaned)) {
    throw new Error("Hex input contains characters outside 0–9 and a–f.");
  }
  if (cleaned.length % 2 !== 0) {
    throw new Error("Hex input must contain an even number of digits.");
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(cleaned.slice(index * 2, index * 2 + 2), 16);
  }
  return decodeUtf8(bytes);
}

function binaryEncode(input: string): string {
  return Array.from(encoder.encode(input), (byte) =>
    byte.toString(2).padStart(8, "0"),
  ).join(" ");
}

function binaryDecode(input: string): string {
  const cleaned = input.replace(/[\s,_]/g, "");
  if (!cleaned) return "";
  if (!/^[01]+$/.test(cleaned)) {
    throw new Error("Binary input must contain only 0 and 1.");
  }
  if (cleaned.length % 8 !== 0) {
    throw new Error("Binary input length must be a multiple of 8 bits.");
  }
  const bytes = new Uint8Array(cleaned.length / 8);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(cleaned.slice(index * 8, index * 8 + 8), 2);
  }
  return decodeUtf8(bytes);
}

export function transformData(
  mode: TransformMode,
  direction: TransformDirection,
  input: string,
): TransformResult {
  if (input.length > MAX_TRANSFORM_LENGTH) {
    return {
      ok: false,
      error: `Input is limited to ${MAX_TRANSFORM_LENGTH.toLocaleString()} characters.`,
    };
  }
  try {
    let output: string;
    switch (mode) {
      case "base64":
        output =
          direction === "encode" ? base64Encode(input) : base64Decode(input);
        break;
      case "url":
        output = direction === "encode" ? urlEncode(input) : urlDecode(input);
        break;
      case "hex":
        output = direction === "encode" ? hexEncode(input) : hexDecode(input);
        break;
      case "binary":
        output =
          direction === "encode" ? binaryEncode(input) : binaryDecode(input);
        break;
      default:
        return { ok: false, error: "Unknown transformation mode." };
    }
    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Transformation failed.",
    };
  }
}
