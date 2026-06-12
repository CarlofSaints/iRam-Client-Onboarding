/**
 * iRam SharePoint Graph client (app-only, client-credentials).
 *
 * Used to provision per-client folder structures in iRam SharePoint by copying
 * a template folder. Reuses the iRam tenant app registration env vars:
 * IRAM_TENANT_ID / IRAM_CLIENT_ID / IRAM_CLIENT_SECRET.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const TENANT_ID = process.env.IRAM_TENANT_ID!;
const CLIENT_ID = process.env.IRAM_CLIENT_ID!;
const CLIENT_SECRET = process.env.IRAM_CLIENT_SECRET!;

const GRAPH = "https://graph.microsoft.com/v1.0";

export const SP_HOST = "iramsa.sharepoint.com";

type GraphOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

// ── Auth ─────────────────────────────────────────────────────────────────────

let _tokenCache: { token: string; expiresAt: number } | null = null;

export async function getToken(): Promise<string> {
  // Token is reusable across requests for ~50 minutes
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token;
  }

  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "iRam Graph: missing IRAM_TENANT_ID / IRAM_CLIENT_ID / IRAM_CLIENT_SECRET env vars"
    );
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(
      `iRam auth failed: ${data.error_description ?? JSON.stringify(data)}`
    );
  }
  _tokenCache = {
    token: data.access_token as string,
    expiresAt: Date.now() + Number(data.expires_in ?? 3500) * 1000,
  };
  return _tokenCache.token;
}

// ── Generic Graph helpers (for SP folder creation) ──────────────────────────

/**
 * Generic Graph API call. Returns the raw Response.
 * Handles absolute URLs (e.g. monitor URLs) and relative paths.
 */
export async function graph(
  token: string,
  path: string,
  options: GraphOptions = {}
): Promise<Response> {
  const { headers = {}, ...rest } = options;
  const url = path.startsWith("http") ? path : `${GRAPH}${path}`;
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
  });
}

/**
 * Generic Graph API call that returns parsed JSON. Throws on non-2xx.
 */
export async function graphJson<T = unknown>(
  token: string,
  path: string,
  options: GraphOptions = {}
): Promise<T> {
  const res = await graph(token, path, options);
  const text = await res.text();
  if (!res.ok)
    throw new Error(`Graph ${options.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : (null as T);
}

/**
 * Poll a SharePoint copy operation monitor URL until completion.
 * The monitor URL is returned in the Location header of a copy request
 * and does not require authentication.
 */
export async function pollSPCopy(monitorUrl: string, timeoutMs = 55000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await sleep(3000);
    try {
      const res = await fetch(monitorUrl);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === "completed") return;
      if (data.status === "failed" || data.status === "deleted") {
        throw new Error(`SP copy failed: ${JSON.stringify(data.error ?? data)}`);
      }
    } catch (e: unknown) {
      if ((e as Error).message?.includes("SP copy failed")) throw e;
      // network error — retry
    }
  }
  throw new Error("SP copy operation timed out");
}
