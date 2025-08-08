"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

type RadiologistInput = {
  name: string
  experience?: number
  label?: string
  confidence?: number
  comment?: string
}

type Metadata = {
  date?: string
  radiologist_inputs?: RadiologistInput[]
  crowdlab_consensus?: number
  final_diagnosis?: string
  treatment?: string
  outcome?: string
  follow_up?: string
}

type Props = {
  datasetBaseUrl: string | null
  datasetName: string | null
}

function getConfidenceColor(value?: number): string {
  if (typeof value !== "number") return "bg-green-600"
  // Three simple bands: red (<40%), orange (40–69%), green (>=70%)
  if (value < 0.5) return "bg-red-500"
  if (value < 0.8) return "bg-orange-400"
  return "bg-green-600"
}

function getConfidenceStyle(value?: number): React.CSSProperties | undefined {
  if (typeof value !== "number") return undefined
  // Small consistent brightness bump so full bars don't appear darker at higher % due to overlay/contrast
  return { filter: "brightness(1.05)" }
}

export default function MetadataPanel({ datasetBaseUrl, datasetName }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Metadata | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    setData(null)
    if (!datasetBaseUrl) return

    const url = `${datasetBaseUrl}/metadata.json`
    setLoading(true)
    fetch(url)
      .then(async (r) => {
        if (!active) return
        if (!r.ok) throw new Error(`Failed to load metadata.json (${r.status})`)
        const json = (await r.json()) as Metadata
        setData(json)
      })
      .catch((e) => active && setError(String(e)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [datasetBaseUrl])

  return (
    <div className="flex flex-col max-h-full min-h-0 overflow-hidden rounded-md border border-white/30 bg-background/70 shadow-sm">
      <div className="border-b border-white/30 bg-background/80 px-3 py-2 text-sm font-semibold tracking-wide text-white/90 flex items-center justify-between">
        <span>Case Details</span>
        {datasetName ? (
          <Badge variant="secondary" className="text-xs">{datasetName}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-4">
        {!datasetBaseUrl && (
          <p className="text-sm text-muted-foreground">Select a dataset folder from the left to view its metadata.</p>
        )}

        {datasetBaseUrl && loading && (
          <p className="text-sm text-muted-foreground">Loading metadata…</p>
        )}

        {datasetBaseUrl && error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {datasetBaseUrl && !loading && !error && data && (
          <div className="space-y-4">
            {/* Summary section (distinguished container) */}
            <div className="rounded-md border-2 border-white/40 p-1">
              <div className="rounded-md border-2 border-double border-white/50 bg-background/70 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {data.date && (
                    <div>
                      <span className="text-muted-foreground">Date:</span> {data.date}
                    </div>
                  )}
                  {data.final_diagnosis && (
                    <div>
                      <span className="text-muted-foreground">Final diagnosis:</span> {data.final_diagnosis}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  {typeof data.crowdlab_consensus === "number" && (
                    <div className="w-full">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">Consensus</span>
                        <span className="text-xs text-muted-foreground">{Math.round(data.crowdlab_consensus * 100)}%</span>
                      </div>
                      <Progress
                        value={Math.round(data.crowdlab_consensus * 100)}
                        indicatorClassName={getConfidenceColor(data.crowdlab_consensus)}
                        indicatorStyle={getConfidenceStyle(data.crowdlab_consensus)}
                      />
                    </div>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {data.treatment && (
                    <div>
                      <span className="text-muted-foreground">Treatment:</span> {data.treatment}
                    </div>
                  )}
                  {data.outcome && (
                    <div>
                      <span className="text-muted-foreground">Outcome:</span> {data.outcome}
                    </div>
                  )}
                  {data.follow_up && (
                    <div className="sm:col-span-2">
                      <span className="text-muted-foreground">Follow-up:</span> {data.follow_up}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Radiologists section */}
            {Array.isArray(data.radiologist_inputs) && data.radiologist_inputs.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Radiologist opinions :</div>
                <div className="space-y-3">
                  {data.radiologist_inputs.map((r, idx) => (
                    <div key={idx} className="rounded-md border border-white/15 bg-background/70 p-3">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-medium truncate">{r.name || `Reader ${idx + 1}`}</span>
                        {typeof r.experience === "number" && (
                          <Badge variant="secondary" className="text-xs whitespace-nowrap font-semibold">{r.experience} yrs</Badge>
                        )}
                        {r.label && (
                          <Badge className="text-xs max-w-[50%] truncate">{r.label}</Badge>
                        )}
                      </div>
                      {typeof r.confidence === "number" && (
                        <div className="mt-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Confidence</span>
                            <span className="text-xs text-muted-foreground">{Math.round(r.confidence * 100)}%</span>
                          </div>
                          <Progress
                            value={Math.round(r.confidence * 100)}
                            indicatorClassName={getConfidenceColor(r.confidence)}
                            indicatorStyle={getConfidenceStyle(r.confidence)}
                          />
                        </div>
                      )}
                      {r.comment && (
                        <p className="mt-2 text-sm text-white/90">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


