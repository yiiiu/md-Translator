import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT = "md-translator-v2";

function getKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET || "local-dev-only-secret-change-in-prod";
  return scryptSync(secret, SALT, KEY_LENGTH) as Buffer;
}

export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return "";
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return "";
  }

  try {
    const buffer = Buffer.from(ciphertext, "base64");
    const iv = buffer.subarray(0, IV_LENGTH);
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);

    return (
      decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8")
    );
  } catch {
    return ciphertext;
  }
}
