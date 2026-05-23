import type { Page, PageSummary, BacklinkPage, Block } from "@/types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  pages: {
    list: () => request<PageSummary[]>("/pages/"),
    get: (id: string) => request<Page>(`/pages/${id}`),
    create: (title: string, blocks: Partial<Block>[] = []) =>
      request<Page>("/pages/", { method: "POST", body: JSON.stringify({ title, blocks }) }),
    update: (id: string, data: { title?: string; blocks?: Partial<Block>[] }) =>
      request<Page>(`/pages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/pages/${id}`, { method: "DELETE" }),
    search: (q: string) => request<PageSummary[]>(`/pages/search?q=${encodeURIComponent(q)}`),
    backlinks: (id: string) => request<BacklinkPage[]>(`/pages/${id}/backlinks`),
  },
};
