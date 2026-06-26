import { randomBytes } from "crypto"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { __resetTokenCipherKeyCache, decryptToken, encryptToken } from "../lib/crypto/token-cipher"

const KEY_B64 = randomBytes(32).toString("base64")

describe("token-cipher", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = KEY_B64
    __resetTokenCipherKeyCache()
  })

  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    __resetTokenCipherKeyCache()
  })

  it("round-trips a token through encrypt/decrypt", () => {
    const token = "eg1~" + randomBytes(2048).toString("hex")
    const encrypted = encryptToken(token)
    expect(encrypted).not.toContain(token)
    expect(decryptToken(encrypted)).toBe(token)
  })

  it("produces a different ciphertext each time (random IV)", () => {
    const token = "same-token"
    expect(encryptToken(token)).not.toBe(encryptToken(token))
  })

  it("accepts a 32-byte hex key as well", () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex")
    __resetTokenCipherKeyCache()
    const encrypted = encryptToken("hello")
    expect(decryptToken(encrypted)).toBe("hello")
  })

  it("rejects a tampered ciphertext (GCM auth tag)", () => {
    const encrypted = encryptToken("secret")
    const buf = Buffer.from(encrypted, "base64")
    buf[buf.length - 1] ^= 0xff // flip a bit in the ciphertext
    expect(() => decryptToken(buf.toString("base64"))).toThrow()
  })

  it("throws when the key is missing", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    __resetTokenCipherKeyCache()
    expect(() => encryptToken("x")).toThrow(/TOKEN_ENCRYPTION_KEY/)
  })

  it("throws when the key is the wrong length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("tooshort").toString("base64")
    __resetTokenCipherKeyCache()
    expect(() => encryptToken("x")).toThrow(/32 bytes/)
  })
})
