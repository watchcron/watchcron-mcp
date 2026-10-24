const API_BASE = "https://watchcron.com/api/v1";
const REQUEST_TIMEOUT = 15_000;

function getApiKey(): string {
  const key = process.env.WATCHCRON_API_KEY;
  if (!key) {
    throw new Error(
      "WATCHCRON_API_KEY environment variable is not set. " +
        "Get your API key at https://watchcron.com"
    );
  }
  return key;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers(), ...(options.headers as Record<string, string>) },
      signal: controller.signal,
    });

    if (res.status === 204) {
      return null as T;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error ?? `API returned ${res.status} ${res.statusText}`;
      throw new Error(message);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out after 15 seconds.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Types ---

export interface CheckData {
  uuid: string;
  name: string;
  description: string | null;
  status: string;
  schedule_type: string;
  period_seconds: number | null;
  cron_expression: string | null;
  timezone: string;
  grace_seconds: number;
  tags: string[] | null;
  is_paused: boolean;
  ping_url: string;
  last_ping_at: string | null;
  next_expected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PingData {
  type: string;
  remote_ip: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface FlipData {
  old_status: string;
  new_status: string;
  created_at: string;
}

export interface ChannelData {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
  checks_count: number;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    pagination: {
      total: number;
      per_page: number;
      current_page: number;
      last_page: number;
    };
  };
}

interface DataResponse<T> {
  data: T;
}

export interface CreateCheckOptions {
  name: string;
  description?: string;
  schedule_type: "simple" | "cron";
  period_seconds?: number;
  cron_expression?: string;
  timezone?: string;
  grace_seconds?: number;
  tags?: string[];
}

export interface UpdateCheckOptions {
  name?: string;
  description?: string;
  schedule_type?: "simple" | "cron";
  period_seconds?: number;
  cron_expression?: string;
  timezone?: string;
  grace_seconds?: number;
  tags?: string[];
}

// --- API methods ---

export async function listChecks(tag?: string): Promise<CheckData[]> {
  const params = new URLSearchParams({ per_page: "100" });
  if (tag) params.set("tag", tag);
  const res = await request<PaginatedResponse<CheckData>>(`/checks?${params}`);
  return res.data;
}

export async function getCheck(uuid: string): Promise<CheckData> {
  const res = await request<DataResponse<CheckData>>(`/checks/${uuid}`);
  return res.data;
}

export async function createCheck(options: CreateCheckOptions): Promise<CheckData> {
  const res = await request<DataResponse<CheckData>>("/checks", {
    method: "POST",
    body: JSON.stringify(options),
  });
  return res.data;
}

export async function updateCheck(uuid: string, options: UpdateCheckOptions): Promise<CheckData> {
  const res = await request<DataResponse<CheckData>>(`/checks/${uuid}`, {
    method: "PUT",
    body: JSON.stringify(options),
  });
  return res.data;
}

export async function deleteCheck(uuid: string): Promise<void> {
  await request<null>(`/checks/${uuid}`, { method: "DELETE" });
}

export async function pauseCheck(uuid: string, paused: boolean): Promise<CheckData> {
  const res = await request<DataResponse<CheckData>>(`/checks/${uuid}/pause`, {
    method: "PATCH",
    body: JSON.stringify({ paused }),
  });
  return res.data;
}

export async function listPings(uuid: string, perPage = 25): Promise<PingData[]> {
  const res = await request<PaginatedResponse<PingData>>(
    `/checks/${uuid}/pings?per_page=${perPage}`
  );
  return res.data;
}

export async function listFlips(uuid: string, perPage = 25): Promise<FlipData[]> {
  const res = await request<PaginatedResponse<FlipData>>(
    `/checks/${uuid}/flips?per_page=${perPage}`
  );
  return res.data;
}

export async function listChannels(): Promise<ChannelData[]> {
  const res = await request<DataResponse<ChannelData[]>>("/channels");
  return res.data;
}
