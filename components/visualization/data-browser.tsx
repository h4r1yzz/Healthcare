"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, ChevronDown, ChevronRight, Folder, Check } from "lucide-react"

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
  onSelectFolder?: (files: Array<{ url: string; name: string }>, folderName: string) => void
}

export default function DataBrowser({ onOpenBase, onSelectFolder }: Props) {
  const [root, setRoot] = useState<DataNode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)

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
    <div className="flex flex-col max-h-full min-h-0 overflow-hidden rounded-md border border-white/30 bg-background/70 shadow-sm">
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
        <div className="flex-1 min-h-0 overflow-auto">
          <Tree
            node={filtered}
            depth={0}
            onOpenBase={(f) => {
              setSelected(f.name)
              onOpenBase(f)
            }}
            selected={selected}
            selectedFolder={selectedFolder}
            onSelectFolder={(files, name) => {
              setSelectedFolder(name)
              onSelectFolder?.(files, name)
            }}
          />
        </div>
      )}
    </div>
  )}

function Tree({ node, depth, onOpenBase, selected, selectedFolder, onSelectFolder }: { node: DataNode; depth: number; onOpenBase: Props["onOpenBase"]; selected?: string | null; selectedFolder?: string | null; onSelectFolder?: Props["onSelectFolder"]; }) {
  const [open, setOpen] = useState(true)
  if (node.type === "file") {
    // Files are non-interactive in browser list (clicks disabled)
    return (
      <div
        className="w-full cursor-default select-text border-b border-white/10 px-3 py-3 text-left text-sm text-white/90 hover:bg-white/5"
        style={{ paddingLeft: depth * 16 }}
        title={node.relPath}
      >
        <div className="flex items-center justify-between">
          <span className="truncate">{node.name}</span>
        </div>
      </div>
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
          <span className="flex-1 font-medium text-left">{node.name}</span>
          {onSelectFolder && (
            <button
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                selectedFolder === node.name
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-white/30 text-white/70 hover:bg-white/10"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                // collect all file descendants
                const collect = (n: DataNode, acc: Array<{ url: string; name: string }>) => {
                  if (n.type === "file" && n.url) acc.push({ url: n.url, name: n.name })
                  n.children?.forEach((c) => collect(c as DataNode, acc))
                }
                const files: Array<{ url: string; name: string }> = []
                collect(node, files)
                onSelectFolder(files, node.name)
              }}
              title="Load all scans from this folder"
            >
              {selectedFolder === node.name ? <Check className="h-4 w-4" /> : "Load"}
            </button>
          )}
        </div>
      )}
      {open && node.children?.map((child) => (
        <Tree key={child.relPath} node={child as DataNode} depth={depth + 1} onOpenBase={onOpenBase} selected={selected} selectedFolder={selectedFolder} onSelectFolder={onSelectFolder} />
      ))}
    </div>
  )
}


