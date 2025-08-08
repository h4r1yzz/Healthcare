"use client"

import React from "react"

type ModKey = "flair" | "seg" | "t1" | "t1ce" | "t2"

type Props = {
  title?: string
  datasetName: string
  modalityOrder: ModKey[]
  present: Record<ModKey, boolean> | null
  active: Record<ModKey, boolean>
  onToggle: (mod: ModKey, next: boolean) => void
}

export default function LayersTable({
  title = "Dataset layers",
  datasetName,
  modalityOrder,
  present,
  active,
  onToggle,
}: Props) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-white/30 bg-background/70">
      <div className="grid grid-cols-6 border-b border-white/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        <div>{title}</div>
        {modalityOrder.map((m) => (
          <div key={m} className="capitalize">
            {m}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 items-center px-3 py-2 text-sm">
        <div className="truncate">{datasetName}</div>
        {modalityOrder.map((m) => {
          const has = !!present?.[m]
          const isActive = !!active[m]
          return (
            <div key={m} className="flex justify-start">
              {has ? (
                <button
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                    isActive
                      ? "border-green-600 bg-green-600"
                      : "border-white/30 hover:bg-white/10"
                  }`}
                  title={isActive ? "Visible" : "Hidden"}
                  onClick={() => onToggle(m, !isActive)}
                >
                  {isActive ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : null}
                </button>
              ) : (
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 text-white/20"
                  title="Not available"
                >
                  {/* empty placeholder */}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


