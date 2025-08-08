import { NextResponse } from "next/server"
import fs from "fs/promises"
import path from "path"

type FileNode = {
  type: "file"
  name: string
  relPath: string
  url: string
}

type DirNode = {
  type: "dir"
  name: string
  relPath: string
  children: Array<DirNode | FileNode>
}

async function walkDirectory(absDir: string, relDir: string): Promise<DirNode> {
  const entries = await fs.readdir(absDir, { withFileTypes: true })
  const children: Array<DirNode | FileNode> = []

  for (const entry of entries) {
    const absChild = path.join(absDir, entry.name)
    const relChild = path.join(relDir, entry.name)
    if (entry.isDirectory()) {
      children.push(await walkDirectory(absChild, relChild))
    } else {
      const lower = entry.name.toLowerCase()
      const isNifti = lower.endsWith(".nii") || lower.endsWith(".nii.gz")
      if (!isNifti) continue
      children.push({
        type: "file",
        name: entry.name,
        relPath: relChild,
        url: path.posix.join("/data", relChild.split(path.sep).join("/")),
      })
    }
  }

  // Sort: directories first then files, alphabetically
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return { type: "dir", name: path.basename(absDir), relPath: relDir, children }
}

export async function GET() {
  try {
    const rootAbs = path.join(process.cwd(), "public", "data")
    const rootExists = await fs
      .stat(rootAbs)
      .then((s) => s.isDirectory())
      .catch(() => false)

    if (!rootExists) {
      return NextResponse.json(
        { error: "public/data directory not found", root: null },
        { status: 404 }
      )
    }

    const tree = await walkDirectory(rootAbs, "")
    return NextResponse.json({ root: tree })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}


