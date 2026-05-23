"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { api } from "@/lib/api";
import type { PageSummary } from "@/types";

export interface WikiLinkPopupRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface Props {
  query: string;
  command: (item: { id: string; label: string }) => void;
}

export const WikiLinkPopup = forwardRef<WikiLinkPopupRef, Props>(
  ({ query, command }, ref) => {
    const [pages, setPages] = useState<PageSummary[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fetch matching pages whenever query changes
    useEffect(() => {
      setSelectedIndex(0);
      if (query.length === 0) {
        api.pages.list().then(setPages).catch(() => setPages([]));
      } else {
        api.pages.search(query).then(setPages).catch(() => setPages([]));
      }
    }, [query]);

    const selectItem = (index: number) => {
      const page = pages[index];
      if (page) {
        command({ id: page.id, label: page.title });
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + pages.length - 1) % pages.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % pages.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (pages.length === 0) {
      return (
        <div className="wiki-link-popup">
          <div className="wiki-link-popup-empty">
            {query ? `No pages matching "${query}"` : "No pages yet"}
          </div>
        </div>
      );
    }

    return (
      <div className="wiki-link-popup">
        {pages.slice(0, 8).map((page, index) => (
          <button
            key={page.id}
            className={`wiki-link-popup-item ${index === selectedIndex ? "selected" : ""}`}
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <span className="wiki-link-popup-brackets">[[</span>
            {page.title}
            <span className="wiki-link-popup-brackets">]]</span>
          </button>
        ))}
      </div>
    );
  }
);

WikiLinkPopup.displayName = "WikiLinkPopup";
