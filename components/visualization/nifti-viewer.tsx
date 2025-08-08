"use client"

import { useEffect, useRef, useState } from "react"

type LoadedVolume = {
  url: string
  name: string
}

export default function NiftiViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const nvRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [vol, setVol] = useState<LoadedVolume | null>(null)
  const [sliceType, setSliceType] = useState<"axial" | "coronal" | "sagittal" | "multiplanar">("multiplanar")
  const DEFAULT_PUBLIC_VOLUME = "/BraTS20_Validation_008_flair.nii"

  useEffect(() => {
    if (!canvasRef.current || nvRef.current) return
    let cancelled = false
    ;(async () => {
      // TypeScript may not have types for @niivue/niivue; treat as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nvMod: any = await import("@niivue/niivue")
      if (cancelled) return
      const nv = new nvMod.Niivue({
        dragAndDropEnabled: false,
        show3Dcrosshair: true,
        isAntiAlias: true,
      })
      nvRef.current = nv
      nv.attachToCanvas(canvasRef.current as HTMLCanvasElement)
      // auto-load default volume from public
      try {
        await nv.loadVolumes([{ url: DEFAULT_PUBLIC_VOLUME, name: "BraTS20_Validation_008_flair.nii" }])
        setVol({ url: DEFAULT_PUBLIC_VOLUME, name: "BraTS20_Validation_008_flair.nii" })
      } catch {}
      setReady(true)
    })()
    return () => {
      cancelled = true
      const nv = nvRef.current
      try {
        nv?.gl?.getExtension && nv?.gl?.getExtension("WEBGL_lose_context")?.loseContext()
      } catch {}
      nvRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!nvRef.current) return
    const nv: any = nvRef.current
    const map: Record<typeof sliceType, string[]> = {
      axial: ["sliceTypeAxial"],
      coronal: ["sliceTypeCoronal"],
      sagittal: ["sliceTypeSagittal"],
      multiplanar: ["sliceTypeMultiplanar", "sliceTypeMultiPlanar"]
    }
    const keys = map[sliceType]
    for (const k of keys) {
      if (nv[k] !== undefined) {
        nv.setSliceType(nv[k])
        break
      }
    }
  }, [sliceType])

  async function onLoadBase(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer])
    const url = URL.createObjectURL(blob)
    const loaded = { url, name: file.name }
    setVol(loaded)
    const nv = nvRef.current
    await nv.loadVolumes([{ url: loaded.url, name: loaded.name }])
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 order-2 lg:order-1">
        <div className="rounded-lg border border-border/60 bg-background/60 p-2">
          <canvas ref={canvasRef} className="w-full aspect-[4/3]" />
        </div>
      </div>

      <div className="lg:col-span-4 order-1 lg:order-2">
        <div className="rounded-lg border border-border/60 bg-background/60 p-4 space-y-5">
          <div>
            <h3 className="font-medium">Load Scan (.nii/.nii.gz)</h3>
            <input
              type="file"
              accept=".nii,.nii.gz,application/gzip"
              onChange={onLoadBase}
              className="mt-2 block w-full text-sm"
              disabled={!ready}
            />
            {vol && (
              <p className="text-xs text-muted-foreground mt-2">Loaded: {vol.name}</p>
            )}
          </div>

          <div className="pt-2 border-t border-border/40">
            <h3 className="font-medium">Slice View</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 rounded border ${sliceType === "axial" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => setSliceType("axial")}
              >
                Axial
              </button>
              <button
                className={`px-3 py-1 rounded border ${sliceType === "coronal" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => setSliceType("coronal")}
              >
                Coronal
              </button>
              <button
                className={`px-3 py-1 rounded border ${sliceType === "sagittal" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => setSliceType("sagittal")}
              >
                Sagittal
              </button>
              <button
                className={`px-3 py-1 rounded border ${sliceType === "multiplanar" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                onClick={() => setSliceType("multiplanar")}
              >
                Multiplanar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


