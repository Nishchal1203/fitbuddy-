export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").trim();

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
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
