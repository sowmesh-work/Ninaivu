"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Search, Brain } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { PageSummary } from "@/types";

const fetcher = () => api.pages.list();

export function Sidebar() {
  const [query, setQuery] = useState("");
  const { data: pages = [] } = useSWR<PageSummary[]>("pages", fetcher, { refreshInterval: 5000 });
  const { activePage, setActivePage } = useStore();

  const filtered = query
    ? pages.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : pages;

  async function handleNewPage() {
    const page = await api.pages.create("Untitled");
    await mutate("pages");
    setActivePage(page.id);
  }

  return (
    <aside className="ninaivu-sidebar w-64 flex flex-col border-r border-border bg-muted/30 shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
        <Brain className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sm tracking-wide">ninaivu</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            className="bg-transparent text-sm flex-1 outline-none placeholder:text-muted-foreground"
            placeholder="Search pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* New page */}
      <div className="px-3 pb-1">
        <button
          onClick={handleNewPage}
          className="muted"
        >
          <Plus className="w-3.5 h-3.5" />
          New page
        </button>
      </div>

      {/* Pages list */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pages</p>
        {filtered.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted-foreground">No pages yet.</p>
        )}
        {filtered.map((page) => (
          <button
            key={page.id}
            onClick={() => setActivePage(page.id)}
            className={activePage === page.id ? "active" : ""}
          >
            <span className="truncate">{page.title || "Untitled"}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
