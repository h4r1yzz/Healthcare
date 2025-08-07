"use client"

import * as React from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import SequenceDropzone from "./sequence-dropzone"
import { Info } from "lucide-react"

type Props = {
  onProcess?: (files: Partial<Record<"t1" | "t2" | "flair" | "t1ce", File>>) => void
}

export default function UploadPanel({ onProcess }: Props) {
  const [t1, setT1] = React.useState<File | null>(null)
  const [t2, setT2] = React.useState<File | null>(null)
  const [flair, setFlair] = React.useState<File | null>(null)
  const [t1ce, setT1ce] = React.useState<File | null>(null)

  const allProvided = Boolean(t1 && t2 && flair && t1ce)

  const handleProcess = () => {
    onProcess?.({ t1: t1 ?? undefined, t2: t2 ?? undefined, flair: flair ?? undefined, t1ce: t1ce ?? undefined })
  }

  return (
    <Card className="border-white/30 bg-background/70">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold tracking-wide text-white/90">Upload MRI Sequences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SequenceDropzone label="T1 Sequence" onFileSelected={setT1} />
          <SequenceDropzone label="T2 Sequence" onFileSelected={setT2} />
          <SequenceDropzone label="FLAIR Sequence" onFileSelected={setFlair} />
          <SequenceDropzone label="T1ce Sequence" onFileSelected={setT1ce} />
        </div>

        <div className="mt-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <Alert className="flex items-start gap-3 border-white/30 bg-background/60 text-white/90">
            <Info className="mt-0.5 h-4 w-4" />
            <AlertDescription>
              All 4 sequences are required for accurate tumor grading
            </AlertDescription>
          </Alert>

          <Button size="lg" disabled={!allProvided} className="md:ml-auto md:min-w-[260px]">
            Process Sequences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


