"use client"

import { useState } from "react"
import { Navbar } from "@/components/nav/Navbar"
import { EditorPanel } from "@/components/editor/EditorPanel"
import { GraphPanel } from "@/components/graph/GraphPanel"
import { useStore } from "@/lib/store"

export default function Home() {
  const activePage = useStore((s) => s.activePage)
  const [graphOpen, setGraphOpen] = useState(false)

  return (
    <div className="ninaivu-app">
      <Navbar graphOpen={graphOpen} onGraphToggle={() => setGraphOpen((o) => !o)} />
      <div className="ninaivu-workspace">
        <EditorPanel />
        {activePage && graphOpen && <GraphPanel pageId={activePage} />}
      </div>
    </div>
  )
}
