#!/usr/bin/env node
/**
 * Generate owner authentication secrets for `.env.local`:
 *   node scripts/hash-admin-password.mjs "<your-password>"
 *
 * Uses colon (`:`) delimiters (`scrypt:<saltHex>:<derivedHex>`) rather than `$`
 * so Next.js / dotenv-expand never interpolates `$hex` segments as env vars.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };
const SCRYPT_KEYLEN = 64;

async function readPassword() {
  const arg = process.argv[2];
  if (arg && arg.trim()) return arg.trim();
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await rl.question("Enter admin password to hash: ");
    return answer.trim();
  } finally {
    rl.close();
  }
}

const password = await readPassword();
if (!password || password.length < 4) {
  console.error("Password must be at least 4 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const derived = scryptSync(
  password.normalize("NFKC"),
  salt,
  SCRYPT_KEYLEN,
  SCRYPT_PARAMS,
);
const hashValue = `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;

// Self-verify before printing so broken output is impossible.
const verifyDerived = scryptSync(
  password.normalize("NFKC"),
  Buffer.from(salt.toString("hex"), "hex"),
  SCRYPT_KEYLEN,
  SCRYPT_PARAMS,
);
if (!verifyDerived.equals(derived)) {
  console.error("Internal self-verification failed.");
  process.exit(1);
}

const sessionSecret = randomBytes(32).toString("base64url");

console.log("\n# Add these lines to .env.local:");
console.log("ADMIN_USERNAME=prasad");
console.log(`ADMIN_PASSWORD_HASH=${hashValue}`);
console.log(`ADMIN_SESSION_SECRET=${sessionSecret}`);
console.log("ADMIN_SESSION_TTL_HOURS=12\n");
