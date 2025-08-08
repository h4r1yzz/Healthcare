"use client"

import React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
          <div>
            <Select value={sliceType} onValueChange={(v) => onChangeSliceType(v as SliceType)}>
              <SelectTrigger className="h-auto w-auto border border-white/20 bg-white px-2 py-1 text-sm text-black focus:ring-0">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/30">
                <SelectItem value="multiplanar">Multiplanar</SelectItem>
                <SelectItem value="axial">Axial</SelectItem>
                <SelectItem value="coronal">Coronal</SelectItem>
                <SelectItem value="sagittal">Sagittal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Layout placeholder to match requested UI; no-op for now */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Layout:</span>
          <div>
            <Select value="auto" disabled>
              <SelectTrigger className="h-auto w-auto border border-white/20 bg-white px-2 py-1 text-sm text-black focus:ring-0">
                <SelectValue placeholder="Auto" />
              </SelectTrigger>
              <SelectContent className="bg-black text-white border-white/30">
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </div>
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


