export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").trim();

const ACCESS_TOKEN_KEY = "access_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferSeconds = 120): boolean {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : Number(payload?.exp);

  if (!Number.isFinite(exp)) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return exp <= now + bufferSeconds;
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { access_token?: string };
    if (typeof data.access_token !== "string" || !data.access_token) {
      return null;
    }

    setAuthToken(data.access_token);
    return data.access_token;
  } catch {
    return null;
  }
}

export async function bootstrapAuthSession(): Promise<string | null> {
  const token = getAuthToken();
  if (token && !isTokenExpired(token)) {
    return token;
  }

  return refreshAccessToken();
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Fall through and clear local state even if the network request fails.
  } finally {
    clearAuthToken();
  }
}

export function buildAuthHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const token = getAuthToken();

  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function readErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string" && data.detail.trim()) {
      return data.detail;
    }

    if (Array.isArray(data?.detail)) {
      const first = data.detail[0];
      if (typeof first === "string") return first;
      if (typeof first?.msg === "string") return first.msg;
    }
  } catch {
    // Return fallback on non-JSON or invalid payload.
  }

  return fallbackMessage;
}
