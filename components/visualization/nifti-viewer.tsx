"use client"

import { useEffect, useRef, useState } from "react"
import DataBrowser from "@/components/visualization/data-browser"
import LayersTable from "@/components/visualization/layers-table"

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
  type ModKey = "flair" | "seg" | "t1" | "t1ce" | "t2"
  const modalityOrder: ModKey[] = ["flair", "seg", "t1", "t1ce", "t2"]
  const [present, setPresent] = useState<Record<ModKey, boolean> | null>(null)
  const [active, setActive] = useState<Record<ModKey, boolean>>({ flair: false, seg: false, t1: false, t1ce: false, t2: false })
  const [datasetName, setDatasetName] = useState<string | null>(null)
  const midRef = useRef<HTMLDivElement | null>(null)
  const [midHeight, setMidHeight] = useState<number | null>(null)

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

  // Keep left browser column the same height as middle (canvas + layers table)
  useEffect(() => {
    const el = midRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setMidHeight(el.offsetHeight)
    })
    ro.observe(el)
    setMidHeight(el.offsetHeight)
    return () => ro.disconnect()
  }, [])

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
    // reflect mask active
    setActive((a) => ({ ...a, seg: true }))
  }

  // Folder selection: load all files, make flair base and seg overlay when present
  async function onSelectFolder(files: Array<{ url: string; name: string }>, name?: string) {
    const nv: any = nvRef.current
    if (!nv) return
    
    // Clear all volumes first
    if (nv.volumes?.length) {
      for (const v of [...nv.volumes]) nv.removeVolume(v)
    }
    
    // Reset states
    setVol(null)
    setOverlayName(null)
    
    // Discover modalities by suffix
    const labelFromName = (n: string): ModKey | string => {
      const lower = n.toLowerCase()
      const suffixes: Array<{ key: ModKey | "pflair"; re: RegExp }> = [
        { key: "flair", re: /(_flair\b|\bflair\b)/ },
        { key: "seg", re: /(_seg\b|\bseg\b)/ },
        { key: "t1ce", re: /(_t1ce\b|\bt1ce\b)/ },
        { key: "t1", re: /(_t1\b|\bt1\b)/ },
        { key: "t2", re: /(_t2\b|\bt2\b)/ },
        { key: "pflair", re: /(_pflair\b|\bpflair\b)/ },
      ]
      for (const s of suffixes) if (s.re.test(lower)) return s.key
      return n
    }
    
    // Find FLAIR scan first (priority: _flair.nii files)
    const flair = files.find((f) => {
      const lower = f.name.toLowerCase()
      return lower.includes("_flair") && (lower.endsWith(".nii") || lower.endsWith(".nii.gz"))
    }) || files[0]
    
    // Load FLAIR as base volume
    if (flair) {
      await nv.loadVolumes([{ url: flair.url, name: flair.name }])
      setVol({ url: flair.url, name: flair.name })
    }
    
    // Find and load segmentation overlay
    const segFile = files.find((f) => {
      const lower = f.name.toLowerCase()
      return lower.includes("_seg") && (lower.endsWith(".nii") || lower.endsWith(".nii.gz"))
    })
    
    if (segFile) {
      await nv.addVolumeFromUrl({ 
        url: segFile.url, 
        name: segFile.name, 
        isLabel: true, 
        colormap: "red", 
        opacity: overlayOpacity 
      })
      setOverlayName(segFile.name)
      
      // Ensure segmentation volume is properly configured
      const segVolume = nv.volumes[nv.volumes.length - 1]
      if (segVolume) {
        segVolume.isLabel = true
        segVolume.colormap = "red"
        segVolume.opacity = overlayOpacity
        nv.updateGLVolume()
      }
    }
    
    // Load other modalities as overlays (but hidden by default)
    for (const f of files) {
      if (f === flair || f === segFile) continue
      const label = labelFromName(f.name)
      if (modalityOrder.includes(label as ModKey)) {
        await nv.addVolumeFromUrl({ url: f.url, name: f.name, opacity: 0 }) // Start hidden
      }
    }
    
    // Build presence map
    const pres: Record<ModKey, boolean> = { flair: false, seg: false, t1: false, t1ce: false, t2: false }
    for (const f of files) {
      const k = labelFromName(f.name)
      if (k === "pflair") continue
      if (modalityOrder.includes(k as ModKey)) pres[k as ModKey] = true
    }
    
    setPresent(pres)
    // Set active state: FLAIR and segmentation should be visible by default
    setActive({ 
      flair: !!pres.flair, 
      seg: !!pres.seg, 
      t1: false, 
      t1ce: false, 
      t2: false 
    })
    setDatasetName(name ?? (files[0]?.name ?? null))
  }

  function setVisibilityForMod(mod: ModKey, makeActive: boolean) {
    const nv: any = nvRef.current
    if (!nv) return
    const findVol = (key: ModKey) => nv.volumes.find((v: any) => v?.name?.toLowerCase().includes(`_${key}`))
    if (mod === "flair") {
      const base = nv.volumes[0]
      if (base) {
        base.opacity = makeActive ? 1 : 0
        nv.updateGLVolume()
      }
      return
    }
    const vol = findVol(mod)
    if (vol) {
      vol.opacity = makeActive ? (mod === "seg" ? overlayOpacity : 1) : 0
      nv.updateGLVolume()
    }
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
    <div className="grid items-stretch gap-6 lg:grid-cols-12">
      {/* Left: File browser */}
      <div className="lg:col-span-3 order-1" style={midHeight ? { height: `${midHeight}px` } : undefined}>
        <DataBrowser onOpenBase={loadBaseFromUrl} onSelectFolder={(files, name) => onSelectFolder(files, name)} />
      </div>

      {/* Middle: Visualization canvas */}
      <div ref={midRef} className="lg:col-span-6 order-2">
        <div className="rounded-lg border border-border/60 bg-background/60 p-2">
          <canvas ref={canvasRef} className="w-full aspect-[4/3]" />
        </div>
        {/* Dataset layers table (always visible) */}
        <LayersTable
          title="File"
          datasetName={datasetName || vol?.name || "—"}
          modalityOrder={modalityOrder}
          present={present || { flair: false, seg: false, t1: false, t1ce: false, t2: false }}
          active={active}
          onToggle={(m, next) => {
            setActive((a) => ({ ...a, [m]: next }))
            setVisibilityForMod(m, next)
          }}
        />
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
                    // Find and update the segmentation overlay specifically
                    const segVol = nv?.volumes?.find((vol: any) => 
                      vol?.name?.toLowerCase().includes("_seg")
                    )
                    if (segVol) {
                      segVol.opacity = v
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


