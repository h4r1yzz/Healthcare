"use client"

import Navbar from "@/components/navbar"
import UploadPanel from "@/components/analysis/upload-panel"
import { useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function AnalysisPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [doneProcessing, setDoneProcessing] = useState(false)
  const [grade, setGrade] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(70)

  const gradeOptions = useMemo(() => ["I", "II", "III", "IV", "Unknown"], [])

  function onStartProcessing() {
    setIsProcessing(true)
    setDoneProcessing(false)
    // Simulate async processing (e.g., hitting API) ~2s
    setTimeout(() => {
      setIsProcessing(false)
      setDoneProcessing(true)
    }, 2000)
  }

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="container max-w-screen-2xl py-8 md:py-12 space-y-8">
          <UploadPanel onProcess={() => onStartProcessing()} />

          {/* Processing pipeline */}
          {isProcessing && (
            <Card className="border-white/30 bg-background/70">
              <CardContent className="p-6">
                <div className="text-2xl font-semibold tracking-wide text-white/90 mb-6">Processing Pipeline</div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-5">
                  {[
                    { label: "Brain Extraction", icon: "🧠" },
                    { label: "Registration", icon: "✳️" },
                    { label: "Normalization", icon: "⚙️" },
                    { label: "Patch Extraction", icon: "🗜️" },
                    { label: "Feature Fusion", icon: "🔗" },
                  ].map((step, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-3">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-3xl">{step.icon}</div>
                      <div className="text-sm text-white/90 text-center">{step.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-md border border-white/20 bg-background/60 p-8 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <div className="mt-4 text-white/90">Processing multi-modal sequences…</div>
                  <div className="text-sm text-muted-foreground mt-2">This may take up to 2 minutes</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radiologist assessment */}
          {doneProcessing && (
            <Card className="border-white/30 bg-background/70">
              <CardContent className="p-6">
                <div className="text-2xl font-semibold tracking-wide text-white/90 mb-6">Radiologist Assessment</div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-3">Your Initial Grade</div>
                    <RadioGroup value={grade ?? ""} onValueChange={(v) => setGrade(v)} className="gap-4">
                      {gradeOptions.map((g) => (
                        <div key={g} className="flex items-center gap-3">
                          <RadioGroupItem value={g} id={`grade-${g}`} />
                          <Label htmlFor={`grade-${g}`} className="text-white/90">
                            {g === "II" ? "Grade II (Low Grade)" : g === "III" ? "Grade III (High Grade)" : `Grade ${g}`}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-white/90">Your Confidence Level</div>
                      <Badge variant="secondary" className="text-xs">{confidence}%</Badge>
                    </div>
                    <div className="px-1">
                      <Slider
                        value={[confidence]}
                        onValueChange={(v) => setConfidence(v[0] ?? confidence)}
                        min={0}
                        max={100}
                        step={1}
                      />
                      <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Low</span>
                        <span>{confidence}%</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Button size="lg" disabled={!grade} onClick={() => { /* submit handler placeholder */ }}>
                    Submit Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}


