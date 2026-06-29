let cachedToken: string | null = null;
let cachedKeepToken: string | null = null;

export function getCachedGmailToken() {
  return cachedToken;
}

export function setCachedGmailToken(token: string | null) {
  cachedToken = token;
}

export function getCachedKeepToken() {
  return cachedKeepToken;
}

export function setCachedKeepToken(token: string | null) {
  cachedKeepToken = token;
}

