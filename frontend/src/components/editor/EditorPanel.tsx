"use client"

import { useCallback } from "react"
import useSWR, { mutate } from "swr"
import type { JSONContent } from "@tiptap/react"
import { api } from "@/lib/api"
import { useStore } from "@/lib/store"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import type { Page } from "@/types"

function pageKey(id: string) { return `page:${id}` }

export function EditorPanel() {
  const { activePage, setActivePage } = useStore()
  const { data: page } = useSWR<Page>(
    activePage ? pageKey(activePage) : null,
    () => api.pages.get(activePage!)
  )

  // Build Tiptap JSON doc from stored blocks
  const initialContent: JSONContent | undefined = page
    ? {
        type: "doc",
        content: page.blocks.length
          ? page.blocks.map((b) => b.content as JSONContent)
          : [{ type: "paragraph" }],
      }
    : undefined

  const handleUpdate = useCallback(
    async (json: JSONContent) => {
      if (!activePage) return
      const blocks = (json.content ?? []).map((node, i) => ({
        type: node.type ?? "paragraph",
        content: node,
        block_index: i,
      }))
      await api.pages.update(activePage, { blocks })
      mutate(pageKey(activePage))
      mutate("pages")
    },
    [activePage]
  )

  const handleTitleBlur = useCallback(
    async (e: React.FocusEvent<HTMLHeadingElement>) => {
      if (!activePage) return
      const newTitle = e.currentTarget.textContent?.trim() ?? "Untitled"
      await api.pages.update(activePage, { title: newTitle })
      mutate(pageKey(activePage))
      mutate("pages")
    },
    [activePage]
  )

  if (!activePage) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select a page or create one to start.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Page title */}
      <div className="px-16 pt-12 pb-4 max-w-3xl mx-auto w-full">
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          className="text-4xl font-bold outline-none text-foreground empty:before:content-['Untitled'] empty:before:text-muted-foreground/50"
          key={activePage}
        >
          {page?.title ?? ""}
        </h1>
      </div>

      {/* Tiptap Simple Editor */}
      {initialContent && (
        <SimpleEditor
          key={activePage}
          initialContent={initialContent}
          onUpdate={handleUpdate}
          onNavigate={setActivePage}
        />
      )}
    </div>
  )
}
