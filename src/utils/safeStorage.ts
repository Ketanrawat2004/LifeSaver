/**
 * safeStorage Utility
 * Transparently wraps localStorage accesses with try-catch blocks.
 * Falls back to an in-memory storage dictionary if localStorage is restricted (such as in private browsing, or iframes with strict cross-origin restrictions).
 */

const inMemoryStore: Record<string, string> = {};

function isLocalStorageAvailable(): boolean {
  try {
    if (typeof window === "undefined" || !("localStorage" in window) || window.localStorage === null) {
      return false;
    }
    const testKey = "__ls_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

const hasLocalStorage = isLocalStorageAvailable();

export const safeStorage = {
  getItem(key: string): string | null {
    if (hasLocalStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn(`safeStorage: failed to get item "${key}" from localStorage:`, e);
      }
    }
    return key in inMemoryStore ? inMemoryStore[key] : null;
  },

  setItem(key: string, value: string): void {
    if (hasLocalStorage) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn(`safeStorage: failed to set item "${key}" in localStorage:`, e);
      }
    }
    inMemoryStore[key] = String(value);
  },

  removeItem(key: string): void {
    if (hasLocalStorage) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn(`safeStorage: failed to remove item "${key}" from localStorage:`, e);
      }
    }
    delete inMemoryStore[key];
  },

  clear(): void {
    if (hasLocalStorage) {
      try {
        window.localStorage.clear();
        return;
      } catch (e) {
        console.warn("safeStorage: failed to clear localStorage:", e);
      }
    }
    for (const key in inMemoryStore) {
      delete inMemoryStore[key];
    }
  }
};
