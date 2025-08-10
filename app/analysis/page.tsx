"use client"

import Navbar from "@/components/navbar"
import UploadPanel from "@/components/analysis/upload-panel"
import SimilarityResults from "@/components/analysis/similarity-results"
import { useMemo, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle, Clock, Brain, FileText } from "lucide-react"

import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"

interface SimilarityMatch {
  id: string
  score: number
  metadata: Record<string, any>
  case_name: string
}

interface ProcessResult {
  case: string
  output_abs_path: string
  output_url: string
  visualization_url: string
  similarity_results?: SimilarityMatch[]
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

const clearAllAssessments = (): void => {
  try {
    radiologists.forEach(radiologist => {
      localStorage.removeItem(`${STORAGE_PREFIX}${radiologist.id}`)
    })
  } catch (error) {
    console.error("Failed to clear assessments from localStorage:", error)
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

  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false)
  const [verdictError, setVerdictError] = useState<string | null>(null)
  const [consensus, setConsensus] = useState<Record<string, string | null> | null>(null)

  // Report generation state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportUrl, setReportUrl] = useState<string | null>(null)

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

  const completedCount = Object.values(completionStatus).filter(Boolean).length
  const allCompleted = completedCount === radiologists.length

  // Function to manually clear all assessments
  const handleClearAllAssessments = () => {
    clearAllAssessments()
    setAssessments({})
    setCompletionStatus({})
    setConsensus(null)
    setVerdictError(null)
    setReportUrl(null)
    setReportError(null)
    toast({
      title: "Assessments Cleared",
      description: "All radiologist assessments have been cleared.",
      variant: "default"
    })
  }

  type ConsensusResponse = {
    scan_id: string
    consensus: Record<string, string | null>
    saved_json_path: string
  }

  type ReportResponse = {
    report_path: string
    download_url: string
    filename: string
  }

  const normalizeTumorType = (value: string | null): string => {
    if (!value) return ""
    if (value === "Pituitary adenoma") return "Pituitary Adenoma"
    return value
  }

  const handleGenerateVerdict = async () => {
    if (!allCompleted) return
    setIsGeneratingVerdict(true)
    setVerdictError(null)
    setConsensus(null)

    const scanId = processResult?.case || `SCAN_${Date.now()}`

    const body = {
      scan_id: scanId,
      assessments: radiologists.map((r) => {
        const a = assessments[r.id] || {
          grade: null,
          location: null,
          tumorType: null,
          tumorSize: null,
          comments: "",
          confidence: 70,
        }
        return {
          radiologist: r.name,
          tumor_location: a.location || "",
          tumor_type: normalizeTumorType(a.tumorType),
          tumor_grade: a.grade || "",
          size: a.tumorSize || "",
          confidence: `${Math.round(a.confidence)}%`,
          comments: a.comments || "",
        }
      }),
    }

    try {
      const res = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }
      const json: ConsensusResponse = await res.json()
      setConsensus(json.consensus)
      toast({ title: 'Final Verdict Generated', description: `Saved to ${json.saved_json_path}`, variant: 'default' })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate verdict'
      setVerdictError(msg)
      toast({ title: 'Verdict Generation Failed', description: msg, variant: 'destructive' })
    } finally {
      setIsGeneratingVerdict(false)
    }
  }

  const handleGenerateReport = async () => {
    if (!consensus || !processResult?.case) {
      toast({
        title: "Cannot Generate Report",
        description: "Please generate consensus first.",
        variant: "destructive"
      })
      return
    }

    setIsGeneratingReport(true)
    setReportError(null)

    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_id: processResult.case
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || `HTTP ${res.status}`)
      }

      const json: ReportResponse = await res.json()
      setReportUrl(json.download_url)

      // Automatically trigger download
      const link = document.createElement('a')
      link.href = json.download_url
      link.download = json.filename
      link.click()

      toast({
        title: 'Medical Report Generated',
        description: `PDF report "${json.filename}" has been generated and downloaded.`,
        variant: 'default'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate report'
      setReportError(msg)
      toast({
        title: 'Report Generation Failed',
        description: msg,
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingReport(false)
    }
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

    // Clear previous assessments when starting new processing
    clearAllAssessments()
    setAssessments({})
    setCompletionStatus({})
    setConsensus(null)
    setVerdictError(null)

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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left column: Results info */}
                  <div className="space-y-4">
                  <div className="text-2xl font-semibold text-green-400 mb-6">Processing Complete</div>
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
                    <div>
                      <div className="text-green-300 font-medium">Visualization:</div>
                      <div className="text-green-200 text-sm mt-1">
                        Middle axial slice showing tumor regions in red
                      </div>
                    </div>
                  </div>

                  {/* Right column: Visualization */}
                  <div className="flex flex-col items-end justify-start -mt-6">
                    <div className="flex flex-col">
                      <div className="text-green-300 font-medium mb-2">Segmentation Preview</div>
                      <div className="relative rounded-lg overflow-hidden border border-green-500/30 bg-black/50 w-fit max-w-full">
                        <img
                          src={processResult.visualization_url}
                          alt="Brain tumor segmentation visualization"
                          className="w-auto h-auto max-w-sm max-h-64 object-contain"
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden flex items-center justify-center w-80 h-64 text-green-300">
                          <div className="text-center">
                            <div className="text-lg">Visualization Unavailable</div>
                            <div className="text-sm opacity-70">Please check the segmentation file</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Similarity search results */}
          {doneProcessing && processResult?.similarity_results && (
            <SimilarityResults results={processResult.similarity_results} />
          )}

          {/* Radiologist assessment */}
          {doneProcessing && (
            <Card className="border-white/30 bg-background/70">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-2xl font-semibold tracking-wide text-white/90">Radiologist Assessment</div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllAssessments}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      Clear All
                    </Button>
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

                {/* Submit + Generate Verdict Row */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4 flex-wrap">
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

                  {/* Generate Final Verdict Button - Always visible when all completed */}
                  {allCompleted && (
                    <div className="flex justify-center mt-6">
                      <Button
                        size="lg"
                        disabled={isGeneratingVerdict}
                        onClick={handleGenerateVerdict}
                        className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 hover:from-blue-700 hover:via-blue-800 hover:to-blue-900 text-white font-bold px-24 py-6 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-blue-500/30 hover:border-blue-400/50 ring-2 ring-blue-500/20 hover:ring-blue-400/30 ring-offset-2 ring-offset-background min-w-[320px]"
                      >
                        {/* Subtle glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-blue-500/20 to-blue-600/20 rounded-md blur-sm -z-10"></div>

                        {isGeneratingVerdict ? (
                          <>
                            <Loader2 className="h-5 w-5 mr-3 animate-spin text-black" />
                            <span className="tracking-wide text-black">Generating Final Verdict...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="h-5 w-5 mr-3 text-black" />
                            <span className="tracking-wide text-black">Generate Final Verdict</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {verdictError && (
                  <div className="mt-2 text-sm text-red-400">{verdictError}</div>
                )}

                {/* Final Verdict Display */}
                {consensus && (
                  <div className="mt-6 rounded-md border border-white/20 bg-background/60 p-4">
                    <div className="text-lg font-semibold text-white/90 mb-4">Final Verdict</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tumor Location:</span> {consensus["Tumor Location"] ?? "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tumor Type:</span> {consensus["Tumor Type"] ?? "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tumor Grade:</span> {consensus["Tumor Grade"] ?? "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Size:</span> {consensus["Size"] ?? "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Confidence:</span> {consensus["Confidence"] ?? "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* PDF Report Generation Section */}
                {consensus && (
                  <div className="mt-6 rounded-md border border-white/20 bg-background/60 p-4">
                    <div className="text-lg font-semibold text-white/90 mb-4">Generate PDF Medical Report</div>
                    <p className="text-sm text-muted-foreground/70 mb-4">
                      Generate a comprehensive medical report combining consensus findings and individual radiologist observations.
                    </p>

                    {/* Generate Report Button */}
                    <div className="flex justify-center">
                      <Button
                        size="lg"
                        disabled={isGeneratingReport}
                        onClick={handleGenerateReport}
                        className="relative bg-gradient-to-r from-green-600 via-green-700 to-green-800 hover:from-green-700 hover:via-green-800 hover:to-green-900 text-black font-bold px-16 py-4 text-base shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-green-500/30 hover:border-green-400/50 [&>*]:text-black [&>span]:text-black [&>svg]:text-black"
                      >
                        {isGeneratingReport ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-3 animate-spin text-black" />
                            <span className="text-black">Generating Report...</span>
                          </>
                        ) : (
                          <>
                            <FileText className="h-4 w-4 mr-3 text-black" />
                            <span className="text-black">Generate PDF Report</span>
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Report Error Display */}
                    {reportError && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                        <p className="text-sm text-red-400">{reportError}</p>
                      </div>
                    )}

                    {/* Report Success Display */}
                    {reportUrl && (
                      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                        <p className="text-sm text-green-400 mb-2">PDF report generated and downloaded successfully!</p>
                        <a
                          href={reportUrl}
                          download
                          className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 underline"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Download PDF Report Again
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  )
}


