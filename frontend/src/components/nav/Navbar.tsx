"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Plus, ChevronDown, Search, Network, Sun, Moon, FileText, X, LogOut, Shield, GitPullRequest } from "lucide-react"
import { api } from "@/lib/api"
import { useStore } from "@/lib/store"
import { useAuth, useCanEdit } from "@/contexts/AuthContext"
import { NinaivuLogo } from "@/components/NinaivuLogo"
import type { PageSummary } from "@/types"

const fetcher = () => api.pages.list()

// ── Theme toggle ──────────────────────────────────────────────────────────────

const THEME_KEY = "ninaivu-theme"

function getInitialDark(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === "dark") return true
  if (stored === "light") return false
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function ThemeButton() {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light")
  }, [dark])

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="nav-icon-btn"
      aria-label="Toggle theme"
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}

// ── Pages popover ─────────────────────────────────────────────────────────────

function PagesMenu({ onGraphToggle, graphOpen }: { onGraphToggle: () => void; graphOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const { activePage, setActivePage } = useStore()
  const { data: pages = [] } = useSWR<PageSummary[]>("pages", fetcher, { refreshInterval: 5000 })
  const canEdit = useCanEdit()

  const filtered = query
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : pages

  const activeMeta = pages.find((p) => p.id === activePage)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  async function handleNew() {
    const page = await api.pages.create("Untitled")
    await mutate("pages")
    setActivePage(page.id)
    setOpen(false)
    setQuery("")
  }

  function handleSelect(id: string) {
    setActivePage(id)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="nav-pages-root">
      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="nav-pages-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <FileText size={13} className="nav-pages-icon" />
        <span className="nav-pages-label">
          {activeMeta?.title?.trim() || (activePage ? "Untitled" : "Pages")}
        </span>
        <ChevronDown size={12} className={`nav-chevron ${open ? "nav-chevron-open" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div ref={panelRef} className="nav-pages-panel" role="listbox">
          {/* Search */}
          <div className="nav-pages-search-wrap">
            <Search size={13} className="nav-pages-search-icon" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages…"
              className="nav-pages-search-input"
            />
            {query && (
              <button onClick={() => setQuery("")} className="nav-pages-search-clear">
                <X size={11} />
              </button>
            )}
          </div>

          {/* List */}
          <ul className="nav-pages-list">
            {filtered.length === 0 && (
              <li className="nav-pages-empty">
                {query ? `No results for "${query}"` : "No pages yet."}
              </li>
            )}
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => handleSelect(p.id)}
                  className={`nav-pages-item ${p.id === activePage ? "nav-pages-item-active" : ""}`}
                  role="option"
                  aria-selected={p.id === activePage}
                >
                  <FileText size={13} className="nav-pages-item-icon" />
                  <span className="nav-pages-item-title">{p.title?.trim() || "Untitled"}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Footer — only editors/admins can create pages */}
          {canEdit && (
            <div className="nav-pages-footer">
              <button onClick={handleNew} className="nav-pages-new-btn">
                <Plus size={13} />
                New page
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Navbar ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  graphOpen: boolean
  onGraphToggle: () => void
}

export function Navbar({ graphOpen, onGraphToggle }: NavbarProps) {
  const { activePage } = useStore()
  const { user, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  const initials = user?.display_name
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?"

  return (
    <header className="ninaivu-navbar">
      {/* Left — wordmark + pages */}
      <div className="nav-left">
        <div className="nav-brand">
          <NinaivuLogo height={30} showText={true} />
        </div>

        <div className="nav-divider" />

        <PagesMenu onGraphToggle={onGraphToggle} graphOpen={graphOpen} />
      </div>

      {/* Right — actions + user */}
      <div className="nav-right">
        {activePage && (
          <button
            onClick={onGraphToggle}
            className={`nav-icon-btn ${graphOpen ? "nav-icon-btn-active" : ""}`}
            title={graphOpen ? "Hide graph" : "Show graph"}
          >
            <Network size={15} />
          </button>
        )}

        {/* Edit requests — for contributors and up */}
        {user && user.role !== "viewer" && (
          <button
            onClick={() => router.push("/requests")}
            className="nav-icon-btn"
            title="Edit requests"
          >
            <GitPullRequest size={15} />
          </button>
        )}

        {/* Admin panel */}
        {user?.role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="nav-icon-btn"
            title="Admin panel"
          >
            <Shield size={15} />
          </button>
        )}

        <ThemeButton />

        <div className="nav-divider" />

        {/* User avatar */}
        <div className="nav-user">
          <div className="nav-avatar" title={user?.email}>{initials}</div>
          <button onClick={handleLogout} className="nav-icon-btn" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  )
}
