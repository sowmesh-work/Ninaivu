"use client";

import { Sidebar } from "@/components/sidebar/Sidebar";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { GraphPanel } from "@/components/graph/GraphPanel";
import { useStore } from "@/lib/store";

export default function Home() {
  const activePage = useStore((s) => s.activePage);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 overflow-hidden">
        <EditorPanel />
        {activePage && <GraphPanel pageId={activePage} />}
      </main>
    </div>
  );
}
