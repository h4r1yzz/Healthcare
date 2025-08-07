"use client"

import React from "react"

type SliceType = "axial" | "coronal" | "sagittal" | "multiplanar"

type Props = {
  sliceType: SliceType
  onChangeSliceType: (t: SliceType) => void
  overlayOpacity: number
  onChangeOverlayOpacity: (v: number) => void
}

export default function ViewerOptions({
  sliceType,
  onChangeSliceType,
  overlayOpacity,
  onChangeOverlayOpacity,
}: Props) {
  return (
    <div className="mt-2 rounded-md border border-white/20 bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">View:</span>
          <select
            className="rounded-md border border-white/20 bg-white px-2 py-1 text-sm text-black"
            value={sliceType}
            onChange={(e) => onChangeSliceType(e.target.value as SliceType)}
          >
            <option value="multiplanar">Multiplanar</option>
            <option value="axial">Axial</option>
            <option value="coronal">Coronal</option>
            <option value="sagittal">Sagittal</option>
          </select>
        </div>

        {/* Layout placeholder to match requested UI; no-op for now */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Layout:</span>
          <select className="rounded-md border border-white/20 bg-white px-2 py-1 text-sm text-black" defaultValue="auto" disabled>
            <option value="auto">Auto</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm font-medium">Mask Opacity</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={overlayOpacity}
            onChange={(e) => onChangeOverlayOpacity(parseFloat(e.target.value))}
          />
          <span className="w-10 text-right text-sm text-muted-foreground">
            {Math.round(overlayOpacity * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}


