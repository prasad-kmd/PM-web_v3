#!/usr/bin/env node
/**
 * Generate a 2-step TOTP secret (with scannable terminal QR code) and 5
 * `scrypt`-hashed emergency recovery codes for the Owner Workstation Suite.
 *
 * Usage:
 *   node scripts/generate-admin-totp.mjs
 *   node scripts/generate-admin-totp.mjs --account prasad --issuer "Prasad M."
 *   node scripts/generate-admin-totp.mjs --yes
 *
 * Output uses colon-delimited `scrypt:<saltHex>:<derivedHex>` hashes (zero `$`
 * characters) so Next.js `.env` variable expansion never corrupts them.
 */

import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;

/* ==========================================================================
   Base32, RFC 6238 TOTP & Recovery Code Helpers
   ========================================================================== */

function encodeBase32(buffer) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function decodeBase32(input) {
  const cleaned = input.toUpperCase().replace(/[\s=-]+/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) return null;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function computeTotp(secretKey, counter) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secretKey).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function verifyTotpWindow(secretBase32, candidate) {
  const clean = String(candidate || "").replace(/[\s-]+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const key = decodeBase32(secretBase32);
  if (!key) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (const delta of [-1, 0, 1]) {
    if (computeTotp(key, step + delta) === clean) return true;
  }
  return false;
}

function generateRecoveryCode() {
  const bytes = randomBytes(12);
  let chars = "";
  for (let i = 0; i < 12; i++) {
    chars += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
  }
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`;
}

function hashRecoveryCode(formattedCode) {
  const normalized = formattedCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const salt = randomBytes(16);
  const derived = scryptSync(
    normalized.normalize("NFKC"),
    salt,
    SCRYPT_KEYLEN,
    SCRYPT_PARAMS,
  );
  // Self-verify round-trip before returning
  const check = scryptSync(
    normalized.normalize("NFKC"),
    salt,
    SCRYPT_KEYLEN,
    SCRYPT_PARAMS,
  );
  if (!timingSafeEqual(derived, check)) {
    throw new Error("Internal scrypt self-check failed.");
  }
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/* ==========================================================================
   Zero-Dependency ISO/IEC 18004 QR Code Encoder (Byte Mode, ECC Level L, v1-9)
   ========================================================================== */

const QR_VERSIONS_L = [
  null,
  { v: 1, size: 21, dataBytes: 19, ecPerBlock: 7, blocks: 1, align: [] },
  { v: 2, size: 25, dataBytes: 34, ecPerBlock: 10, blocks: 1, align: [6, 18] },
  { v: 3, size: 29, dataBytes: 55, ecPerBlock: 15, blocks: 1, align: [6, 22] },
  { v: 4, size: 33, dataBytes: 80, ecPerBlock: 20, blocks: 1, align: [6, 26] },
  { v: 5, size: 37, dataBytes: 108, ecPerBlock: 26, blocks: 1, align: [6, 30] },
  { v: 6, size: 41, dataBytes: 136, ecPerBlock: 18, blocks: 2, align: [6, 34] },
  {
    v: 7,
    size: 45,
    dataBytes: 156,
    ecPerBlock: 20,
    blocks: 2,
    align: [6, 22, 38],
  },
  {
    v: 8,
    size: 49,
    dataBytes: 194,
    ecPerBlock: 24,
    blocks: 2,
    align: [6, 24, 42],
  },
  {
    v: 9,
    size: 53,
    dataBytes: 232,
    ecPerBlock: 30,
    blocks: 2,
    align: [6, 26, 46],
  },
];

// GF(256) log/antilog tables with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
}

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function rsGeneratorPoly(degree) {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i];
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data, ecLen) {
  const gen = rsGeneratorPoly(ecLen);
  const rem = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let j = 0; j < ecLen; j++) {
      rem[j] ^= gfMul(gen[j + 1], factor);
    }
  }
  return rem;
}

function bchFormatBits(ecLevelBits, maskPattern) {
  const data = (ecLevelBits << 3) | maskPattern;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >>> i) & 1) {
      rem ^= 0x537 << (i - 10);
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function bchVersionBits(version) {
  let rem = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((rem >>> i) & 1) {
      rem ^= 0x1f25 << (i - 12);
    }
  }
  return (version << 12) | rem;
}

function maskCondition(mask, r, c) {
  switch (mask) {
    case 0:
      return (r + c) % 2 === 0;
    case 1:
      return r % 2 === 0;
    case 2:
      return c % 3 === 0;
    case 3:
      return (r + c) % 3 === 0;
    case 4:
      return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5:
      return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6:
      return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    case 7:
      return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    default:
      return false;
  }
}

function scorePenalty(modules) {
  const n = modules.length;
  let score = 0;

  // Rule 1: adjacent runs >= 5 in rows and cols
  for (let i = 0; i < n; i++) {
    let rowRun = 1;
    let colRun = 1;
    for (let j = 1; j < n; j++) {
      if (modules[i][j] === modules[i][j - 1]) {
        rowRun++;
        if (rowRun === 5) score += 3;
        else if (rowRun > 5) score += 1;
      } else {
        rowRun = 1;
      }
      if (modules[j][i] === modules[j - 1][i]) {
        colRun++;
        if (colRun === 5) score += 3;
        else if (colRun > 5) score += 1;
      } else {
        colRun = 1;
      }
    }
  }

  // Rule 2: 2x2 identical blocks
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r][c];
      if (
        v === modules[r][c + 1] &&
        v === modules[r + 1][c] &&
        v === modules[r + 1][c + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 patterns (10111010000 or 00001011101)
  for (let i = 0; i < n; i++) {
    let rowBits = 0;
    let colBits = 0;
    for (let j = 0; j < n; j++) {
      rowBits = ((rowBits << 1) & 0x7ff) | modules[i][j];
      colBits = ((colBits << 1) & 0x7ff) | modules[j][i];
      if (j >= 10) {
        if (rowBits === 0x5d0 || rowBits === 0x05d) score += 40;
        if (colBits === 0x5d0 || colBits === 0x05d) score += 40;
      }
    }
  }

  // Rule 4: dark/light balance
  let dark = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (modules[r][c]) dark++;
    }
  }
  const ratio = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}

function encodeQrMatrix(text) {
  const utf8 = Buffer.from(text, "utf8");
  const spec = QR_VERSIONS_L.slice(1).find(
    (entry) => utf8.length + 2 <= entry.dataBytes,
  );
  if (!spec) {
    throw new Error(`Payload too long for terminal QR (${utf8.length} bytes).`);
  }

  // Build bit buffer: Byte mode indicator (0100) + 8-bit byte count (v1-9) + payload + terminator + pad
  const bits = [];
  const pushBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  pushBits(0b0100, 4);
  pushBits(utf8.length, 8);
  for (const byte of utf8) pushBits(byte, 8);

  const capacityBits = spec.dataBytes * 8;
  const term = Math.min(4, capacityBits - bits.length);
  pushBits(0, term);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataWords = new Uint8Array(spec.dataBytes);
  for (let i = 0; i < bits.length / 8; i++) {
    let b = 0;
    for (let k = 0; k < 8; k++) b = (b << 1) | bits[i * 8 + k];
    dataWords[i] = b;
  }
  const padBytes = [0xec, 0x11];
  for (let i = bits.length / 8, p = 0; i < spec.dataBytes; i++, p ^= 1) {
    dataWords[i] = padBytes[p];
  }

  // Split into RS blocks & interleave
  const blockLen = spec.dataBytes / spec.blocks;
  const dataBlocks = [];
  const ecBlocks = [];
  for (let b = 0; b < spec.blocks; b++) {
    const slice = dataWords.subarray(b * blockLen, (b + 1) * blockLen);
    dataBlocks.push(slice);
    ecBlocks.push(rsComputeRemainder(slice, spec.ecPerBlock));
  }

  const finalBytes = [];
  for (let i = 0; i < blockLen; i++) {
    for (let b = 0; b < spec.blocks; b++) finalBytes.push(dataBlocks[b][i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (let b = 0; b < spec.blocks; b++) finalBytes.push(ecBlocks[b][i]);
  }

  const codeBits = [];
  for (const byte of finalBytes) {
    for (let k = 7; k >= 0; k--) codeBits.push((byte >>> k) & 1);
  }

  // Construct function patterns
  const n = spec.size;
  const isFunc = Array.from({ length: n }, () => new Uint8Array(n));
  const base = Array.from({ length: n }, () => new Uint8Array(n));

  const setFunc = (r, c, dark) => {
    if (r < 0 || c < 0 || r >= n || c >= n) return;
    isFunc[r][c] = 1;
    base[r][c] = dark ? 1 : 0;
  };

  const placeFinder = (top, left) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onRing = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFunc(top + dr, left + dc, inOuter && (onRing || inCore));
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  // Timing patterns
  for (let i = 8; i < n - 8; i++) {
    setFunc(6, i, i % 2 === 0);
    setFunc(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  for (const ar of spec.align) {
    for (const ac of spec.align) {
      if (
        (ar === 6 && ac === 6) ||
        (ar === 6 && ac === n - 7) ||
        (ar === n - 7 && ac === 6)
      ) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFunc(ar + dr, ac + dc, dark);
        }
      }
    }
  }

  // Dark module + reserve format areas
  setFunc(n - 8, 8, true);
  for (let i = 0; i <= 8; i++) {
    if (!isFunc[8][i]) setFunc(8, i, false);
    if (!isFunc[i][8]) setFunc(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setFunc(8, n - 1 - i, false);
    setFunc(n - 1 - i, 8, false);
  }

  // Version info (v >= 7)
  if (spec.v >= 7) {
    const vBits = bchVersionBits(spec.v);
    for (let i = 0; i < 18; i++) {
      const bit = Boolean((vBits >>> i) & 1);
      const r = Math.floor(i / 3);
      const c = n - 11 + (i % 3);
      setFunc(r, c, bit);
      setFunc(c, r, bit);
    }
  }

  // Place upward/downward 2-column zig-zag data bits
  let bitIdx = 0;
  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (let colOffset = 0; colOffset < 2; colOffset++) {
        const c = right - colOffset;
        if (!isFunc[r][c]) {
          base[r][c] = bitIdx < codeBits.length ? codeBits[bitIdx++] : 0;
        }
      }
    }
    upward = !upward;
  }

  // Evaluate all 8 masks (ECC Level L format bits = 0b01) and pick lowest penalty
  let bestMatrix = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row) => Uint8Array.from(row));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (!isFunc[r][c] && maskCondition(mask, r, c)) {
          candidate[r][c] ^= 1;
        }
      }
    }

    const fmt = bchFormatBits(0b01, mask);
    for (let i = 0; i <= 5; i++) candidate[8][i] = (fmt >>> (14 - i)) & 1;
    candidate[8][7] = (fmt >>> 8) & 1;
    candidate[8][8] = (fmt >>> 7) & 1;
    candidate[7][8] = (fmt >>> 6) & 1;
    for (let i = 9; i < 15; i++) {
      candidate[14 - i][8] = (fmt >>> (14 - i)) & 1;
    }
    for (let i = 0; i < 7; i++) {
      candidate[n - 1 - i][8] = (fmt >>> (14 - i)) & 1;
    }
    for (let i = 0; i < 8; i++) {
      candidate[8][n - 8 + i] = (fmt >>> (7 - i)) & 1;
    }
    candidate[n - 8][8] = 1;

    const score = scorePenalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      bestMatrix = candidate;
    }
  }

  return bestMatrix;
}

function renderTerminalQr(matrix) {
  const quiet = 4;
  const n = matrix.length;
  const total = n + quiet * 2;
  const isDark = (r, c) => {
    const mr = r - quiet;
    const mc = c - quiet;
    if (mr < 0 || mc < 0 || mr >= n || mc >= n) return false;
    return matrix[mr][mc] === 1;
  };

  // White background quiet-zone card using Unicode half-blocks so scanners work
  // cleanly on BOTH dark and light terminal themes.
  const lines = [];
  for (let r = 0; r < total; r += 2) {
    let line = "  ";
    for (let c = 0; c < total; c++) {
      const topDark = isDark(r, c);
      const botDark = r + 1 < total ? isDark(r + 1, c) : false;
      // Render inverted light-paper card (`█` = white paper, ` ` = dark ink)
      if (!topDark && !botDark) line += "█";
      else if (!topDark && botDark) line += "▀";
      else if (topDark && !botDark) line += "▄";
      else line += " ";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

/* ==========================================================================
   CLI Entrypoint
   ========================================================================== */

function readDefaultAccountFromEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    try {
      const content = readFileSync(file, "utf8");
      const match = content.match(/^ADMIN_USERNAME=(.+)$/m);
      if (match && match[1]) {
        return match[1].trim().replace(/^['"]|['"]$/g, "");
      }
    } catch {
      // ignore
    }
  }
  return "owner";
}

function parseArgs(argv) {
  let account = readDefaultAccountFromEnv() || "owner";
  let issuer = "Prasad M.";
  let skipPrompt = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--account" && argv[i + 1]) {
      account = argv[++i].trim();
    } else if (arg === "--issuer" && argv[i + 1]) {
      issuer = argv[++i].trim();
    } else if (arg === "--yes" || arg === "-y" || arg === "--non-interactive") {
      skipPrompt = true;
    }
  }
  return { account, issuer, skipPrompt };
}

async function main() {
  const { account, issuer, skipPrompt } = parseArgs(process.argv.slice(2));

  // 160-bit (20-byte -> 32 Base32 chars) RFC 6238 secret
  const secretBytes = randomBytes(20);
  const secretBase32 = encodeBase32(secretBytes);
  const groupedSecret = secretBase32.match(/.{1,4}/g).join(" ");

  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const otpauthUri =
    `otpauth://totp/${label}` +
    `?secret=${secretBase32}` +
    `&issuer=${encodeURIComponent(issuer)}`;

  const qrMatrix = encodeQrMatrix(otpauthUri);
  const qrArt = renderTerminalQr(qrMatrix);

  const recoveryCodes = Array.from({ length: 5 }, () => generateRecoveryCode());
  const recoveryHashes = recoveryCodes.map((code) => hashRecoveryCode(code));

  console.log(
    "\n┌────────────────────────────────────────────────────────────┐",
  );
  console.log("│  Owner Workstation Suite · Two-Step TOTP Enrollment        │");
  console.log(
    "└────────────────────────────────────────────────────────────┘\n",
  );
  console.log("1. Scan this QR code in your authenticator app");
  console.log(
    "   (Proton Pass, 1Password, Ente Auth, Apple Passwords, etc.):\n",
  );
  console.log(qrArt);
  console.log(`\n   Manual key : ${groupedSecret}`);
  console.log(`   Issuer     : ${issuer}`);
  console.log(`   Account    : ${account}`);
  console.log(`   URI        : ${otpauthUri}\n`);

  if (process.stdin.isTTY && !skipPrompt) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const answer = await rl.question(
          "2. Enter the 6-digit code from your app to verify sync (or press Enter to skip): ",
        );
        if (!answer.trim()) {
          console.log("   Skipped live code check.\n");
          break;
        }
        if (verifyTotpWindow(secretBase32, answer)) {
          console.log(
            "   ✓ Verified! Authenticator app & system clock are in sync.\n",
          );
          break;
        }
        if (attempt < 3) {
          console.log("   ✗ Code did not match (±30s window). Try again.");
        } else {
          console.log(
            "   ⚠ Could not verify after 3 attempts — check your device clock before deploying.\n",
          );
        }
      }
    } finally {
      rl.close();
    }
  }

  console.log(
    "3. Save these 5 emergency recovery codes in your password manager",
  );
  console.log("   (shown only once — never stored in plaintext):\n");
  for (const code of recoveryCodes) {
    console.log(`     • ${code}`);
  }

  console.log(
    "\n4. Paste these lines into `.env.local` (or your hosting env vars):\n",
  );
  console.log(`ADMIN_TOTP_SECRET=${secretBase32}`);
  console.log(`ADMIN_TRUST_TTL_DAYS=30`);
  console.log(`ADMIN_RECOVERY_HASHES=${recoveryHashes.join(",")}\n`);
}

main().catch((err) => {
  console.error("Failed to generate TOTP enrollment:", err);
  process.exit(1);
});
