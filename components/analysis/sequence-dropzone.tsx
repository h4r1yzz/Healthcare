"use client"

import * as React from "react"
import { UploadCloud, Loader2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type SequenceDropzoneProps = {
  label: string
  description?: string
  accept?: string
  onFileSelected?: (file: File | null) => void
}

export default function SequenceDropzone({
  label,
  description = "Click or drag to upload",
  accept,
  onFileSelected,
}: SequenceDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = React.useState(false)
  const [previewError, setPreviewError] = React.useState(false)

  const generatePreview = async (file: File) => {
    setIsGeneratingPreview(true)
    setPreviewError(false)
    setPreviewUrl(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/preview?size=256', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to generate preview')
      }

      // Create blob URL for the preview image
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (error) {
      console.error('Preview generation error:', error)
      setPreviewError(true)
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleFiles = (files: FileList | null) => {
    const nextFile = files && files.length > 0 ? files[0] : null

    // Clean up previous preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }

    setFile(nextFile)
    setPreviewError(false)
    onFileSelected?.(nextFile)

    // Generate preview if file is selected
    if (nextFile) {
      generatePreview(nextFile)
    }
  }

  // Clean up preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isDragging) setIsDragging(true)
  }

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  return (
    <div
      className={cn(
        "group relative flex h-80 w-full cursor-pointer select-none items-center justify-center rounded-xl border-2 border-dashed transition-colors",
        "bg-background/60 border-white/30",
        isDragging && "border-white/60 bg-white/5"
      )}
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      role="button"
      aria-label={`${label} uploader`}
    >
      {file ? (
        <div className="flex flex-col items-center text-center text-white/80 space-y-3">
          {/* Preview Image Section */}
          <div className="flex items-center justify-center w-48 h-48 rounded-lg bg-white/10 border border-white/20">
            {isGeneratingPreview ? (
              <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            ) : previewError ? (
              <AlertCircle className="h-8 w-8 text-red-400" />
            ) : previewUrl ? (
              <img
                src={previewUrl}
                alt="NIfTI preview"
                className="w-full h-full object-contain rounded-lg"
              />
            ) : (
              <UploadCloud className="h-8 w-8 text-white/60" />
            )}
          </div>

          {/* File Info Section */}
          <div className="space-y-1">
            <div className="text-base font-medium text-white/90">{label}</div>
            <div className="max-w-[200px] truncate text-sm text-white/70">
              {file.name}
            </div>
            {previewError && (
              <div className="text-xs text-red-400">
                Preview failed
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center text-white/80">
          <UploadCloud className="mb-4 h-10 w-10 opacity-80" />
          <div className="text-base font-medium text-white/90">{label}</div>
          <div className="mt-1 text-sm">{description}</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}


