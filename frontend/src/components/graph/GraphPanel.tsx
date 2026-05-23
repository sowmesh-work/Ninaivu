"use client";

import useSWR from "swr";
import { Link2, ArrowLeftRight } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { BacklinkPage, Page } from "@/types";

interface Props {
  pageId: string;
}

export function GraphPanel({ pageId }: Props) {
  const setActivePage = useStore((s) => s.setActivePage);

  const { data: page } = useSWR<Page>(`page:${pageId}`, () => api.pages.get(pageId));
  const { data: backlinks = [] } = useSWR<BacklinkPage[]>(
    `backlinks:${pageId}`,
    () => api.pages.backlinks(pageId),
    { refreshInterval: 3000 },
  );

  // Derive outgoing wiki links from page title mentions — for now show linked page titles
  // (Real graph expansion will come in Phase 3)

  return (
    <aside className="w-64 flex flex-col border-l border-border bg-muted/20 shrink-0 overflow-y-auto">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Graph</p>
      </div>

      {/* Backlinks */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Backlinks</p>
        </div>
        {backlinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pages link here yet.</p>
        ) : (
          <ul className="space-y-1">
            {backlinks.map((bl) => (
              <li key={bl.id}>
                <button
                  onClick={() => setActivePage(bl.id)}
                  className="text-sm text-primary hover:underline text-left truncate w-full"
                >
                  {bl.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-1.5 mb-2">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked pages</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Use <code className="bg-muted px-1 rounded">[[Page Title]]</code> in the editor to link pages.
          Outgoing links will appear here.
        </p>
      </div>

      {/* Mini graph placeholder — Phase 2 */}
      <div className="px-4 py-3 border-t border-border flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Mini graph</p>
        <div className="rounded-lg border border-dashed border-border h-40 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-4">
            React Flow graph coming in Phase 2
          </p>
        </div>
      </div>
    </aside>
  );
}
