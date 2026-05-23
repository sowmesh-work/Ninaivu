"use client";

import { useEffect, useCallback, useRef } from "react";
import useSWR, { mutate } from "swr";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { Page } from "@/types";

function pageKey(id: string) { return `page:${id}`; }

export function EditorPanel() {
  const activePage = useStore((s) => s.activePage);
  const { data: page } = useSWR<Page>(
    activePage ? pageKey(activePage) : null,
    () => api.pages.get(activePage!),
  );

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing… use [[Page Title]] to link pages." }),
    ],
    editorProps: {
      attributes: { class: "tiptap-editor" },
    },
    onUpdate: ({ editor }) => {
      if (!activePage) return;
      // Debounced save — 1 second after last keystroke
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const json = editor.getJSON();
        // Map top-level nodes to blocks
        const blocks = (json.content ?? []).map((node, i) => ({
          type: node.type ?? "paragraph",
          content: node,
          block_index: i,
        }));
        await api.pages.update(activePage, { blocks });
        mutate(pageKey(activePage));
        mutate("pages");
      }, 1000);
    },
  });

  // Load page content into editor when page changes
  useEffect(() => {
    if (!editor || !page) return;
    // Reconstruct Tiptap doc from blocks
    const content = page.blocks.map((b) => b.content);
    editor.commands.setContent({ type: "doc", content: content.length ? content : [{ type: "paragraph" }] });
  }, [page?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTitleBlur = useCallback(
    async (e: React.FocusEvent<HTMLHeadingElement>) => {
      if (!activePage) return;
      const newTitle = e.currentTarget.textContent?.trim() ?? "Untitled";
      await api.pages.update(activePage, { title: newTitle });
      mutate(pageKey(activePage));
      mutate("pages");
    },
    [activePage],
  );

  if (!activePage) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
        Select a page or create one to start.
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-12 py-10 max-w-3xl mx-auto w-full">
        {/* Title */}
        <h1
          contentEditable
          suppressContentEditableWarning
          onBlur={handleTitleBlur}
          className="text-4xl font-bold outline-none mb-6 empty:before:content-['Untitled'] empty:before:text-muted-foreground"
          key={activePage}
        >
          {page?.title ?? ""}
        </h1>

        {/* Editor */}
        <div className="tiptap-editor min-h-[60vh]">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
