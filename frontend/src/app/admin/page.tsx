"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api, type AdminUserOut, type AdminAccessRequestOut } from "@/lib/api"
import { Shield, Check, X, ChevronDown } from "lucide-react"

const ROLES = ["viewer", "contributor", "editor", "admin"]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<AdminUserOut[]>([])
  const [accessRequests, setAccessRequests] = useState<AdminAccessRequestOut[]>([])
  const [tab, setTab] = useState<"users" | "access">("access")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && user?.role !== "admin") router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (user?.role !== "admin") return
    api.admin.users().then(setUsers)
    api.admin.accessRequests().then(setAccessRequests)
  }, [user])

  async function handleRoleChange(userId: string, role: string) {
    setBusy(true)
    try {
      const updated = await api.admin.setRole(userId, role)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } finally {
      setBusy(false)
    }
  }

  async function handleReviewAccess(requestId: string, approved: boolean) {
    setBusy(true)
    try {
      const updated = await api.admin.reviewAccess(requestId, approved)
      setAccessRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)))
      // Refresh user list to reflect role change
      api.admin.users().then(setUsers)
    } finally {
      setBusy(false)
    }
  }

  if (loading || user?.role !== "admin") return null

  const pending = accessRequests.filter((r) => r.status === "pending")
  const reviewed = accessRequests.filter((r) => r.status !== "pending")

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="admin-header-left">
          <Shield size={18} className="admin-header-icon" />
          <h1 className="admin-title">Admin</h1>
        </div>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${tab === "access" ? "admin-tab-active" : ""}`}
            onClick={() => setTab("access")}
          >
            Access requests
            {pending.length > 0 && <span className="admin-badge">{pending.length}</span>}
          </button>
          <button
            className={`admin-tab ${tab === "users" ? "admin-tab-active" : ""}`}
            onClick={() => setTab("users")}
          >
            Users
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* ── Access requests ── */}
        {tab === "access" && (
          <div className="admin-section">
            {pending.length === 0 && reviewed.length === 0 && (
              <p className="admin-empty">No access requests yet.</p>
            )}

            {pending.length > 0 && (
              <>
                <p className="admin-section-label">Pending</p>
                <div className="admin-list">
                  {pending.map((req) => (
                    <div key={req.id} className="admin-row">
                      <div className="admin-row-info">
                        <span className="admin-row-name">{req.user_display_name}</span>
                        <span className="admin-row-meta">{req.user_email}</span>
                        <span className="admin-row-meta">
                          Requesting: <strong>{req.requested_role}</strong>
                        </span>
                        {req.reason && <span className="admin-row-reason">"{req.reason}"</span>}
                      </div>
                      <div className="admin-row-actions">
                        <button
                          className="admin-action-btn admin-action-approve"
                          onClick={() => handleReviewAccess(req.id, true)}
                          disabled={busy}
                          title="Approve"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          className="admin-action-btn admin-action-reject"
                          onClick={() => handleReviewAccess(req.id, false)}
                          disabled={busy}
                          title="Reject"
                        >
                          <X size={13} /> Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {reviewed.length > 0 && (
              <>
                <p className="admin-section-label" style={{ marginTop: "1.5rem" }}>History</p>
                <div className="admin-list">
                  {reviewed.map((req) => (
                    <div key={req.id} className="admin-row admin-row-reviewed">
                      <div className="admin-row-info">
                        <span className="admin-row-name">{req.user_display_name}</span>
                        <span className="admin-row-meta">{req.user_email} → {req.requested_role}</span>
                      </div>
                      <span className={`admin-status-badge admin-status-${req.status}`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Users ── */}
        {tab === "users" && (
          <div className="admin-section">
            <div className="admin-list">
              {users.map((u) => (
                <div key={u.id} className="admin-row">
                  <div className="admin-row-info">
                    <span className="admin-row-name">{u.display_name}</span>
                    <span className="admin-row-meta">{u.email}</span>
                    {!u.is_active && <span className="admin-row-meta" style={{ color: "hsl(var(--destructive))" }}>Deactivated</span>}
                  </div>
                  <div className="admin-row-actions">
                    {u.id !== user.id && (
                      <div className="admin-role-select-wrap">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={busy}
                          className="admin-role-select"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="admin-role-select-icon" />
                      </div>
                    )}
                    {u.id === user.id && (
                      <span className="admin-status-badge admin-status-approved">{u.role} (you)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
