"use client"

import { useCallback } from "react"
import useSWR, { mutate } from "swr"
import type { JSONContent } from "@tiptap/react"
import { api } from "@/lib/api"
import { useStore } from "@/lib/store"
import { useCanEdit } from "@/contexts/AuthContext"
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import type { Page } from "@/types"

function pageKey(id: string) { return `page:${id}` }

export function EditorPanel() {
  const { activePage, setActivePage } = useStore()
  const canEdit = useCanEdit()

  const { data: page } = useSWR<Page>(
    activePage ? pageKey(activePage) : null,
    () => api.pages.get(activePage!)
  )

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
      if (!activePage || !canEdit) return
      const blocks = (json.content ?? []).map((node, i) => ({
        type: node.type ?? "paragraph",
        content: node,
        block_index: i,
      }))
      await api.pages.update(activePage, { blocks })
      mutate(pageKey(activePage))
      mutate("pages")
    },
    [activePage, canEdit]
  )

  const handleTitleBlur = useCallback(
    async (e: React.FocusEvent<HTMLHeadingElement>) => {
      if (!activePage || !canEdit) return
      const newTitle = e.currentTarget.textContent?.trim() ?? "Untitled"
      await api.pages.update(activePage, { title: newTitle })
      mutate(pageKey(activePage))
      mutate("pages")
    },
    [activePage, canEdit]
  )

  if (!activePage) {
    return (
      <div className="editor-empty-state">
        <p className="editor-empty-hint">Open a page from the menu above, or create one to start.</p>
      </div>
    )
  }

  if (!initialContent) {
    return <div className="editor-empty-state" />
  }

  return (
    <SimpleEditor
      key={activePage}
      initialContent={initialContent}
      onUpdate={canEdit ? handleUpdate : undefined}
      onNavigate={setActivePage}
      title={page?.title ?? ""}
      onTitleBlur={canEdit ? handleTitleBlur : undefined}
      editable={canEdit}
    />
  )
}
