"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, ChevronDown, ChevronRight, Folder } from "lucide-react"

export type DataNode = {
  type: "dir" | "file"
  name: string
  relPath: string
  url?: string
  children?: DataNode[]
}

type Props = {
  onOpenBase: (file: { url: string; name: string }) => void
  onOpenMask?: (file: { url: string; name: string }) => void
}

export default function DataBrowser({ onOpenBase }: Props) {
  const [root, setRoot] = useState<DataNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/data")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        if (d?.root) setRoot(d.root)
        else setError(d?.error || "Unable to load data list")
      })
      .catch((e) => active && setError(String(e)))
    return () => {
      active = false
    }
  }, [])

  // filter tree by query (case-insensitive). Keep directories that contain matches
  const filtered = useMemo(() => {
    if (!root) return null
    const q = query.trim().toLowerCase()
    if (!q) return root
    const walk = (n: DataNode): DataNode | null => {
      if (n.type === "file") {
        return n.name.toLowerCase().includes(q) ? n : null
      }
      const kids = (n.children || [])
        .map((c) => walk(c as DataNode))
        .filter(Boolean) as DataNode[]
      if (kids.length === 0 && !n.name.toLowerCase().includes(q)) return null
      return { ...n, children: kids }
    }
    return walk(root)
  }, [root, query])

  return (
    <div className="overflow-hidden rounded-md border border-white/30 bg-background/70 shadow-sm">
      <div className="border-b border-white/30 bg-background/80 px-3 py-2 text-sm font-semibold tracking-wide text-white/90">
        Browser
      </div>
      <div className="border-b border-white/20 bg-background/60 px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases…"
            className="w-full rounded border border-white/20 bg-transparent py-1.5 pl-8 pr-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
      {!root && !error && <p className="px-3 py-2 text-sm text-muted-foreground">Loading…</p>}
      {filtered && (
        <div className="max-h-80 overflow-auto">
          <Tree
            node={filtered}
            depth={0}
            onOpenBase={(f) => {
              setSelected(f.name)
              onOpenBase(f)
            }}
            selected={selected}
          />
        </div>
      )}
    </div>
  )}

function Tree({ node, depth, onOpenBase, selected }: { node: DataNode; depth: number; onOpenBase: Props["onOpenBase"]; selected?: string | null; }) {
  const [open, setOpen] = useState(true)
  if (node.type === "file") {
    const isSelected = selected === node.name
    return (
      <button
        className={`w-full text-left border-b border-white/10 px-3 py-3 text-sm focus:outline-none ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}
        style={{ paddingLeft: depth * 16 }}
        onClick={() => onOpenBase({ url: node.url!, name: node.name })}
        title={node.relPath}
      >
        {node.name}
      </button>
    )
  }
  return (
    <div>
      {depth === 0 ? null : (
        <div
          className="flex cursor-pointer select-none items-center border-b border-white/10 px-3 py-3 text-sm hover:bg-white/5"
          style={{ paddingLeft: depth * 14 }}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="mr-1 h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="mr-1 h-4 w-4 text-muted-foreground" />
          )}
          <Folder className="mr-2 h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{node.name}</span>
        </div>
      )}
      {open && node.children?.map((child) => (
        <Tree key={child.relPath} node={child as DataNode} depth={depth + 1} onOpenBase={onOpenBase} selected={selected} />
      ))}
    </div>
  )
}


