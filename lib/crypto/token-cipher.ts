// Application-layer encryption for sensitive provider tokens (Epic OAuth).
//
// Tokens are replayed to Epic's API, so they cannot be hashed — they must be
// recoverable. We encrypt them with AES-256-GCM (authenticated encryption)
// using a 32-byte key supplied via TOKEN_ENCRYPTION_KEY, which lives in the
// app's environment and NEVER in the database. A database dump alone therefore
// cannot reveal any token.
//
// Wire format (base64): iv (12 bytes) ++ authTag (16 bytes) ++ ciphertext.

import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12 // GCM standard nonce size
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // AES-256

let cachedKey: Buffer | null = null

// Resolve the 32-byte key from TOKEN_ENCRYPTION_KEY. Accepts base64 or hex; the
// decoded value must be exactly 32 bytes. Cached after first resolution.
function getKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set — cannot encrypt/decrypt provider tokens")
  }

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex")
  } else {
    key = Buffer.from(raw, "base64")
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}). ` +
        "Generate one with: openssl rand -base64 32",
    )
  }

  cachedKey = key
  return key
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64")
}

export function decryptToken(payload: string): string {
  const buffer = Buffer.from(payload, "base64")
  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid token ciphertext: payload too short")
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
}

// Exposed for tests that need to reset the memoized key after changing env.
export function __resetTokenCipherKeyCache(): void {
  cachedKey = null
}
