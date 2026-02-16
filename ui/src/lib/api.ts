const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

export const api = {
  metrics: () =>
    http<{
      strategies_total: number;
      strategies_enabled: number;
      runs_total: number;
      runs_errors: number;
    }>("/metrics/overview"),
  listStrategies: () => http<any[]>("/strategies"),
  createStrategy: (body: any) =>
    http<any>("/strategies", { method: "POST", body: JSON.stringify(body) }),
  updateStrategy: (id: string, body: any) =>
    http<any>(`/strategies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteStrategy: (id: string) =>
    http<any>(`/strategies/${id}`, { method: "DELETE" }),
  listRuns: () => http<any[]>("/runs?limit=100"),
  listRunsFiltered: (params: Record<string, string>) => {
    const API_BASE =
      import.meta.env.VITE_API_BASE ?? "http://localhost:8000/api";
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/runs?${qs}`).then(async (res) => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });
  },
  listSymbols: async () => {
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8001/api";
    const r = await fetch(`${base}/symbols?limit=500`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  createSymbol: async (payload: any) => {
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8001/api";
    const r = await fetch(`${base}/symbols`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  updateSymbol: async (id: string, patch: any) => {
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8001/api";
    const r = await fetch(`${base}/symbols/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  deleteSymbol: async (id: string) => {
    const base = import.meta.env.VITE_API_BASE ?? "http://localhost:8001/api";
    const r = await fetch(`${base}/symbols/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(await r.text());
    return true;
  },
};
