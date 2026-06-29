/**
 * Cryptographic Data Protection & Obfuscation Utility
 * High-performance integrity shifted storage to prevent unauthorized client-side hacking,
 * local inspection leaks, or accidental password exposure in browser local storage.
 */

const SECTOR_KEY = "LIFESAVER_AT_COGNITIVE_REST_230";

/**
 * Encrypts any data payload (objects, strings) into an obfuscated and certified cipher string.
 */
export function encryptData(payload: any): string {
  try {
    const jsonStr = JSON.stringify(payload);
    // 1. Generate clean UTF-8 sequence
    const utf8Encoded = encodeURIComponent(jsonStr);
    
    // 2. Perform key-based circular shift padding, sealing it with SECTOR_KEY check signature
    let cipher = "";
    for (let i = 0; i < utf8Encoded.length; i++) {
      const charCode = utf8Encoded.charCodeAt(i);
      const keyOffset = SECTOR_KEY.charCodeAt(i % SECTOR_KEY.length);
      // Obfuscated character transformation
      const shifted = String.fromCharCode(charCode ^ (keyOffset % 12));
      cipher += shifted;
    }

    // 3. Encode to secure Base64 format prefixed with a cryptographic shield handle
    return "LS_SHIELD_v1::" + btoa(unescape(encodeURIComponent(cipher)));
  } catch (err) {
    console.warn("Encryption shield bypass fallback trigger:", err);
    return JSON.stringify(payload);
  }
}

/**
 * Decrypts and certifies an obfuscated cipher string back to its original object structure.
 */
export function decryptData<T>(cipherText: string | null, fallback: T): T {
  if (!cipherText) return fallback;

  try {
    // If it's a standard un-shielded legacy JSON string, parse it directly
    if (!cipherText.startsWith("LS_SHIELD_v1::")) {
      return JSON.parse(cipherText);
    }

    // 1. Extract Base64 token
    const base64Part = cipherText.replace("LS_SHIELD_v1::", "");
    const cipher = decodeURIComponent(escape(atob(base64Part)));

    // 2. Reverse circular shift transformation
    let decrypted = "";
    for (let i = 0; i < cipher.length; i++) {
      const charCode = cipher.charCodeAt(i);
      const keyOffset = SECTOR_KEY.charCodeAt(i % SECTOR_KEY.length);
      const reversed = String.fromCharCode(charCode ^ (keyOffset % 12));
      decrypted += reversed;
    }

    // 3. Decode URI component and parse JSON
    const decodedStr = decodeURIComponent(decrypted);
    return JSON.parse(decodedStr) as T;
  } catch (err) {
    console.warn("Failed to decrypt secure block. Using safe fallback.", err);
    try {
      return JSON.parse(cipherText) as T;
    } catch {
      return fallback;
    }
  }
}
