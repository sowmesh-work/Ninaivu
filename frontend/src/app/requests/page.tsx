"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useCanEdit } from "@/contexts/AuthContext"
import { api, type EditRequestOut } from "@/lib/api"
import { Check, X, GitPullRequest, ChevronLeft } from "lucide-react"

export default function RequestsPage() {
  const { user, loading } = useAuth()
  const canEdit = useCanEdit()
  const router = useRouter()

  const [requests, setRequests] = useState<EditRequestOut[]>([])
  const [selected, setSelected] = useState<EditRequestOut | null>(null)
  const [comment, setComment] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [user, loading, router])

  useEffect(() => {
    if (user) api.editRequests.list().then(setRequests)
  }, [user])

  async function handleReview(id: string, approved: boolean) {
    setBusy(true)
    try {
      const updated = await api.editRequests.review(id, approved, comment || undefined)
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)))
      setSelected(updated)
      setComment("")
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user) return null

  const pending = requests.filter((r) => r.status === "pending")
  const reviewed = requests.filter((r) => r.status !== "pending")

  if (selected) {
    return (
      <div className="admin-shell">
        <div className="admin-header">
          <button className="nav-icon-btn" onClick={() => setSelected(null)} style={{ marginRight: 8 }}>
            <ChevronLeft size={16} />
          </button>
          <h1 className="admin-title">Edit request — {selected.page_title}</h1>
        </div>

        <div className="admin-content">
          <div className="req-diff-meta">
            <span>By <strong>{selected.author_name}</strong></span>
            {selected.note && <span className="req-diff-note">"{selected.note}"</span>}
            <span className={`admin-status-badge admin-status-${selected.status}`}>{selected.status}</span>
          </div>

          <div className="req-diff-grid">
            <div className="req-diff-col">
              <p className="req-diff-label">Proposed title</p>
              <p className="req-diff-title">{selected.proposed_title ?? "(unchanged)"}</p>
            </div>
          </div>

          <div className="req-diff-grid">
            <div className="req-diff-col">
              <p className="req-diff-label">Proposed content</p>
              <div className="req-diff-blocks">
                {(selected.proposed_blocks as { type: string; content?: { text?: string }[] }[]).map((b, i) => (
                  <p key={i} className="req-diff-block-text">
                    {b.content?.map((n) => n.text ?? "").join("") || <em style={{ opacity: 0.4 }}>empty block</em>}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {canEdit && selected.status === "pending" && (
            <div className="req-review-form">
              <textarea
                className="req-review-comment"
                placeholder="Optional comment for the author…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="req-review-actions">
                <button
                  className="admin-action-btn admin-action-approve"
                  onClick={() => handleReview(selected.id, true)}
                  disabled={busy}
                >
                  <Check size={13} /> Accept & apply
                </button>
                <button
                  className="admin-action-btn admin-action-reject"
                  onClick={() => handleReview(selected.id, false)}
                  disabled={busy}
                >
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          )}

          {selected.review_comment && (
            <div className="req-review-comment-display">
              <p className="admin-section-label">Review comment</p>
              <p className="req-diff-note">"{selected.review_comment}"</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <div className="admin-header">
        <div className="admin-header-left">
          <GitPullRequest size={18} className="admin-header-icon" />
          <h1 className="admin-title">Edit requests</h1>
        </div>
      </div>

      <div className="admin-content">
        {requests.length === 0 && (
          <p className="admin-empty">No edit requests yet.</p>
        )}

        {pending.length > 0 && (
          <>
            <p className="admin-section-label">Pending review</p>
            <div className="admin-list">
              {pending.map((req) => (
                <button key={req.id} className="admin-row admin-row-clickable" onClick={() => setSelected(req)}>
                  <div className="admin-row-info">
                    <span className="admin-row-name">{req.page_title}</span>
                    <span className="admin-row-meta">by {req.author_name}</span>
                    {req.note && <span className="admin-row-reason">"{req.note}"</span>}
                  </div>
                  <span className="admin-status-badge admin-status-pending">pending</span>
                </button>
              ))}
            </div>
          </>
        )}

        {reviewed.length > 0 && (
          <>
            <p className="admin-section-label" style={{ marginTop: "1.5rem" }}>History</p>
            <div className="admin-list">
              {reviewed.map((req) => (
                <button key={req.id} className="admin-row admin-row-clickable admin-row-reviewed" onClick={() => setSelected(req)}>
                  <div className="admin-row-info">
                    <span className="admin-row-name">{req.page_title}</span>
                    <span className="admin-row-meta">by {req.author_name}</span>
                  </div>
                  <span className={`admin-status-badge admin-status-${req.status}`}>{req.status}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
