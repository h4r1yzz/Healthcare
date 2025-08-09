"use client"

import Navbar from "@/components/navbar"
import UploadPanel from "@/components/analysis/upload-panel"
import { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, Clock } from "lucide-react"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface ProcessResult {
  case: string
  output_abs_path: string
  output_url: string
}

type RadiologistAssessment = {
  grade: string | null
  location: string | null
  tumorType: string | null
  tumorSize: string | null
  comments: string
  confidence: number
}

type SavedAssessment = RadiologistAssessment & {
  radiologistId: string
  radiologistName: string
  submittedAt: string
  isCompleted: boolean
}

type Radiologist = {
  id: string
  name: string
}

const radiologists: Radiologist[] = [
  { id: "chen", name: "Dr. Sarah Chen" },
  { id: "rodriguez", name: "Dr. Michael Rodriguez" },
  { id: "patel", name: "Dr. Priya Patel" }
]

// localStorage utilities
const STORAGE_PREFIX = "neurograde_assessment_"

const saveAssessmentToStorage = (radiologistId: string, assessment: RadiologistAssessment, isCompleted: boolean = false): void => {
  const radiologist = radiologists.find(r => r.id === radiologistId)
  if (!radiologist) return

  const savedAssessment: SavedAssessment = {
    ...assessment,
    radiologistId,
    radiologistName: radiologist.name,
    submittedAt: new Date().toISOString(),
    isCompleted
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${radiologistId}`, JSON.stringify(savedAssessment))
  } catch (error) {
    console.error("Failed to save assessment to localStorage:", error)
  }
}

const loadAssessmentFromStorage = (radiologistId: string): SavedAssessment | null => {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${radiologistId}`)
    if (!stored) return null
    return JSON.parse(stored) as SavedAssessment
  } catch (error) {
    console.error("Failed to load assessment from localStorage:", error)
    return null
  }
}



export default function AnalysisPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [doneProcessing, setDoneProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentRadiologist, setCurrentRadiologist] = useState<string>("chen")
  const [assessments, setAssessments] = useState<Record<string, RadiologistAssessment>>({})
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const gradeOptions = useMemo(() => ["I", "II", "III", "IV", "Unknown"], [])
  const locationOptions = useMemo(() => ["Frontal", "Parietal", "Temporal", "Occipital", "Cerebellum", "Brainstem"], [])
  const tumorTypeOptions = useMemo(() => ["Glioma", "Meningioma", "Metastasis", "Pituitary adenoma", "Other"], [])
  const tumorSizeOptions = useMemo(() => ["<10cm³", "10-50cm³", ">50cm³"], [])

  // Helper function to format grade labels
  const formatGradeLabel = (grade: string) => {
    switch (grade) {
      case "II":
        return "Grade II (Low Grade)"
      case "III":
        return "Grade III (High Grade)"
      default:
        return `Grade ${grade}`
    }
  }

  // Load assessments and completion status on component mount
  useEffect(() => {
    const loadedAssessments: Record<string, RadiologistAssessment> = {}
    const loadedStatus: Record<string, boolean> = {}

    radiologists.forEach(radiologist => {
      const saved = loadAssessmentFromStorage(radiologist.id)
      if (saved) {
        loadedAssessments[radiologist.id] = {
          grade: saved.grade,
          location: saved.location,
          tumorType: saved.tumorType,
          tumorSize: saved.tumorSize,
          comments: saved.comments,
          confidence: saved.confidence
        }
        loadedStatus[radiologist.id] = saved.isCompleted
      } else {
        loadedStatus[radiologist.id] = false
      }
    })

    setAssessments(loadedAssessments)
    setCompletionStatus(loadedStatus)
  }, [])

  // Auto-save current assessment to localStorage when it changes
  useEffect(() => {
    const currentAssessment = getCurrentAssessment()
    if (Object.values(currentAssessment).some(value => value !== null && value !== "" && value !== 70)) {
      saveAssessmentToStorage(currentRadiologist, currentAssessment, false)
    }
  }, [assessments, currentRadiologist])

  // Helper functions for managing radiologist assessments
  const getCurrentAssessment = (): RadiologistAssessment => {
    return assessments[currentRadiologist] || {
      grade: null,
      location: null,
      tumorType: null,
      tumorSize: null,
      comments: "",
      confidence: 70
    }
  }

  const updateCurrentAssessment = (updates: Partial<RadiologistAssessment>) => {
    setAssessments(prev => ({
      ...prev,
      [currentRadiologist]: {
        ...getCurrentAssessment(),
        ...updates
      }
    }))
  }

  // Submit assessment function
  const handleSubmitAssessment = async () => {
    const currentAssessment = getCurrentAssessment()
    const radiologist = radiologists.find(r => r.id === currentRadiologist)

    if (!radiologist) return

    setIsSubmitting(true)

    try {
      // Save as completed assessment
      saveAssessmentToStorage(currentRadiologist, currentAssessment, true)

      // Update completion status
      setCompletionStatus(prev => ({
        ...prev,
        [currentRadiologist]: true
      }))

      // Show success toast
      toast({
        title: "Assessment Submitted Successfully",
        description: `${radiologist.name}'s assessment has been saved and submitted.`,
        variant: "default"
      })

    } catch (error) {
      console.error("Failed to submit assessment:", error)
      toast({
        title: "Submission Failed",
        description: "There was an error submitting the assessment. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get current assessment values
  const currentAssessment = getCurrentAssessment()
  const isCurrentAssessmentComplete = completionStatus[currentRadiologist] || false

  async function onStartProcessing(files: Partial<Record<"t1" | "t2" | "flair" | "t1ce", File>>) {
    if (!files.t1 || !files.t2 || !files.flair || !files.t1ce) {
      setError("All 4 MRI sequences are required")
      return
    }

    setIsProcessing(true)
    setDoneProcessing(false)
    setError(null)
    setProcessResult(null)

    try {
      // Create FormData for multipart upload
      const formData = new FormData()
      formData.append('t1', files.t1)
      formData.append('t2', files.t2)
      formData.append('flair', files.flair)
      formData.append('t1ce', files.t1ce)
      formData.append('case', `CASE_${Date.now()}`)

      // Call Next.js API route which forwards to FastAPI backend
      const response = await fetch('/api/prediction', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const result: ProcessResult = await response.json()
      setProcessResult(result)
      setDoneProcessing(true)
    } catch (err) {
      console.error('Processing error:', err)
      setError(err instanceof Error ? err.message : 'Failed to process sequences')
    } finally {
      setIsProcessing(false)
    }
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
          <UploadPanel onProcess={onStartProcessing} isProcessing={isProcessing} />

          {/* Error handling */}
          {error && (
            <Card className="border-red-500/30 bg-red-950/20">
              <CardContent className="p-6">
                <div className="text-red-400 font-medium">Processing Error</div>
                <div className="text-red-300 mt-2">{error}</div>
              </CardContent>
            </Card>
          )}

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

          {/* Processing Results */}
          {doneProcessing && processResult && (
            <Card className="border-green-500/30 bg-green-950/20">
              <CardContent className="p-6">
                <div className="text-2xl font-semibold tracking-wide text-green-400 mb-6">Processing Complete</div>
                <div className="space-y-4">
                  <div>
                    <div className="text-green-300 font-medium">Case ID:</div>
                    <div className="text-green-200">{processResult.case}</div>
                  </div>
                  <div>
                    <div className="text-green-300 font-medium">Segmentation File:</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Direct download from public folder
                          window.open(processResult.output_url, '_blank')
                        }}
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      >
                        Download Segmentation (.nii)
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Radiologist assessment */}
          {doneProcessing && (
            <Card className="border-white/30 bg-background/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-2xl font-semibold tracking-wide text-white/90">Radiologist Assessment</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white/70">Radiologist:</span>
                    <Select value={currentRadiologist} onValueChange={setCurrentRadiologist}>
                      <SelectTrigger className="w-[220px] bg-background/60 border-white/30 text-white/90">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {radiologists.map((radiologist) => (
                          <SelectItem key={radiologist.id} value={radiologist.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{radiologist.name}</span>
                              {completionStatus[radiologist.id] && (
                                <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isCurrentAssessmentComplete && (
                      <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                  {/* Grade Field */}
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-3">Tumor Grade</div>
                    <Select value={currentAssessment.grade ?? ""} onValueChange={(value) => updateCurrentAssessment({ grade: value })}>
                      <SelectTrigger className="bg-background/60 border-white/30 text-white/90">
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((g) => (
                          <SelectItem key={g} value={g}>
                            {formatGradeLabel(g)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Field */}
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-3">Location</div>
                    <Select value={currentAssessment.location ?? ""} onValueChange={(value) => updateCurrentAssessment({ location: value })}>
                      <SelectTrigger className="bg-background/60 border-white/30 text-white/90">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tumor Type Field */}
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-3">Tumor Type</div>
                    <Select value={currentAssessment.tumorType ?? ""} onValueChange={(value) => updateCurrentAssessment({ tumorType: value })}>
                      <SelectTrigger className="bg-background/60 border-white/30 text-white/90">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {tumorTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tumor Size Field */}
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-3">Tumor Size</div>
                    <Select value={currentAssessment.tumorSize ?? ""} onValueChange={(value) => updateCurrentAssessment({ tumorSize: value })}>
                      <SelectTrigger className="bg-background/60 border-white/30 text-white/90">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {tumorSizeOptions.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Comments Field */}
                <div className="mb-8">
                  <div className="text-sm font-medium text-white/90 mb-3">Additional Comments</div>
                  <Textarea
                    value={currentAssessment.comments}
                    onChange={(e) => updateCurrentAssessment({ comments: e.target.value })}
                    placeholder="Enter additional observations or notes..."
                    className="bg-background/60 border-white/30 text-white/90 placeholder:text-muted-foreground/70 min-h-[100px]"
                    rows={4}
                  />
                </div>

                {/* Confidence Slider */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium text-white/90">Your Confidence Level</div>
                    <Badge variant="secondary" className="text-xs">{currentAssessment.confidence}%</Badge>
                  </div>
                  <div className="px-1">
                    <Slider
                      value={[currentAssessment.confidence]}
                      onValueChange={(v) => updateCurrentAssessment({ confidence: v[0] ?? currentAssessment.confidence })}
                      min={0}
                      max={100}
                      step={1}
                    />
                    <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                      <span>Low</span>
                      <span>{currentAssessment.confidence}%</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    disabled={
                      !currentAssessment.grade ||
                      !currentAssessment.location ||
                      !currentAssessment.tumorType ||
                      !currentAssessment.tumorSize ||
                      isSubmitting
                    }
                    onClick={handleSubmitAssessment}
                    className={isCurrentAssessmentComplete ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : isCurrentAssessmentComplete ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resubmit Assessment
                      </>
                    ) : (
                      "Submit Assessment"
                    )}
                  </Button>

                  {/* Assessment Status Summary */}
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <span>Progress:</span>
                    <div className="flex items-center gap-1">
                      {radiologists.map((radiologist) => (
                        <div key={radiologist.id} className="flex items-center gap-1">
                          {completionStatus[radiologist.id] ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-xs">{radiologist.name.split(' ')[1]}</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-xs">
                      ({Object.values(completionStatus).filter(Boolean).length}/{radiologists.length} completed)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}


