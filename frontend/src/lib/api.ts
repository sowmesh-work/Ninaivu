import { supabase } from "@/lib/supabase"
import type { Page, PageSummary, BacklinkPage, Block } from "@/types"

const BASE = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // Attach the Supabase JWT on every request
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
    ...init,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(err)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserMe {
  id: string
  email: string
  display_name: string
  role: "admin" | "editor" | "contributor" | "viewer"
}

export interface AccessRequestOut {
  id: string
  requested_role: string
  reason: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

export interface AdminAccessRequestOut extends AccessRequestOut {
  user_id: string
  user_email: string
  user_display_name: string
}

export interface AdminUserOut {
  id: string
  email: string
  display_name: string
  role: string
  is_active: boolean
  created_at: string
}

export interface EditRequestOut {
  id: string
  page_id: string
  page_title: string
  author_id: string
  author_name: string
  proposed_title: string | null
  proposed_blocks: unknown[]
  note: string | null
  status: "pending" | "accepted" | "rejected"
  review_comment: string | null
  created_at: string
}

// ── API ───────────────────────────────────────────────────────────────────────

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

  auth: {
    me: () => request<UserMe>("/auth/me"),
  },

  accessRequests: {
    submit: (requested_role: string, reason?: string) =>
      request<AccessRequestOut>("/access-requests/", {
        method: "POST",
        body: JSON.stringify({ requested_role, reason }),
      }),
    mine: () => request<AccessRequestOut[]>("/access-requests/mine"),
  },

  editRequests: {
    list: () => request<EditRequestOut[]>("/edit-requests/"),
    get: (id: string) => request<EditRequestOut>(`/edit-requests/${id}`),
    submit: (data: {
      page_id: string
      proposed_title?: string
      proposed_blocks: unknown[]
      note?: string
    }) => request<EditRequestOut>("/edit-requests/", { method: "POST", body: JSON.stringify(data) }),
    review: (id: string, approved: boolean, comment?: string) =>
      request<EditRequestOut>(`/edit-requests/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ approved, comment }),
      }),
  },

  admin: {
    users: () => request<AdminUserOut[]>("/admin/users"),
    setRole: (userId: string, role: string) =>
      request<AdminUserOut>(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    deactivate: (userId: string) =>
      request<AdminUserOut>(`/admin/users/${userId}/deactivate`, { method: "PATCH" }),
    accessRequests: () => request<AdminAccessRequestOut[]>("/admin/access-requests"),
    reviewAccess: (requestId: string, approved: boolean) =>
      request<AdminAccessRequestOut>(`/admin/access-requests/${requestId}/review`, {
        method: "POST",
        body: JSON.stringify({ approved }),
      }),
  },
}
