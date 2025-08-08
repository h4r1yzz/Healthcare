"use client"

import { useEffect, useRef, useState } from "react"
import DataBrowser from "@/components/visualization/data-browser"

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
  const [overlayName, setOverlayName] = useState<string | null>(null)
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5)
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

  async function loadBaseFromUrl(file: { url: string; name: string }) {
    const nv: any = nvRef.current
    if (!nv) return
    // Clear all existing volumes (base + overlays)
    if (nv.volumes?.length) {
      for (const v of [...nv.volumes]) nv.removeVolume(v)
    }
    await nv.loadVolumes([{ url: file.url, name: file.name }])
    setVol({ url: file.url, name: file.name })
    setOverlayName(null)
  }

  async function loadMaskFromUrl(file: { url: string; name: string }) {
    const nv: any = nvRef.current
    if (!nv) return
    // Remove existing overlays while keeping base (index 0)
    if (nv.volumes?.length > 1) {
      for (let i = nv.volumes.length - 1; i >= 1; i--) nv.removeVolume(nv.volumes[i])
    }
    await nv.addVolumeFromUrl({ url: file.url, name: file.name, isLabel: true, colormap: "red", opacity: overlayOpacity })
    setOverlayName(file.name)
  }

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

  async function onLoadMask(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer])
    const url = URL.createObjectURL(blob)
    const name = file.name
    const nv: any = nvRef.current
    // Load overlay as label image with a red colormap; adjust as needed
    await nv.addVolumeFromUrl({ url, name, isLabel: true, colormap: "red", opacity: overlayOpacity })
    setOverlayName(name)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left: File browser */}
      <div className="lg:col-span-3 order-1">
        <DataBrowser onOpenBase={loadBaseFromUrl} />
      </div>

      {/* Middle: Visualization canvas */}
      <div className="lg:col-span-6 order-2">
        <div className="rounded-lg border border-border/60 bg-background/60 p-2">
          <canvas ref={canvasRef} className="w-full aspect-[4/3]" />
        </div>
      </div>

      {/* Right: Controls */}
      <div className="lg:col-span-3 order-3">
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

          

          <div className="pt-2 border-t border-white/30">
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

          {overlayName && (
            <div className="rounded-md border border-white/30 bg-background/60 p-3">
              <h3 className="font-medium">Mask Opacity</h3>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={overlayOpacity}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    setOverlayOpacity(v)
                    const nv: any = nvRef.current
                    const ov = nv?.volumes?.[1]
                    if (ov) {
                      ov.opacity = v
                      nv.updateGLVolume()
                    }
                  }}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm text-muted-foreground">{Math.round(overlayOpacity * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


