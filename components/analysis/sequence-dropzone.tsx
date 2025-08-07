"use client"

import * as React from "react"
import { UploadCloud } from "lucide-react"
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

  const handleFiles = (files: FileList | null) => {
    const nextFile = files && files.length > 0 ? files[0] : null
    setFile(nextFile)
    onFileSelected?.(nextFile)
  }

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
        "group relative flex h-56 w-full cursor-pointer select-none items-center justify-center rounded-xl border-2 border-dashed transition-colors",
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
      <div className="flex flex-col items-center text-center text-white/80">
        <UploadCloud className="mb-4 h-10 w-10 opacity-80" />
        <div className="text-base font-medium text-white/90">{label}</div>
        {file ? (
          <div className="mt-1 max-w-[85%] truncate text-sm text-white/70">
            {file.name}
          </div>
        ) : (
          <div className="mt-1 text-sm">{description}</div>
        )}
      </div>

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


