"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Search, TrendingUp, X, ZoomIn, MapPin, Layers } from "lucide-react"
import { useState, useEffect } from "react"

interface SimilarityMatch {
  id: string
  score: number
  metadata: Record<string, any>
  case_name: string
}

interface SimilarityResultsProps {
  results: SimilarityMatch[]
}

export default function SimilarityResults({ results }: SimilarityResultsProps) {
  const [selectedImage, setSelectedImage] = useState<{
    src: string
    alt: string
    caseId: string
  } | null>(null)

  if (!results || results.length === 0) {
    return null
  }

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1)
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500/20 text-green-300 border-green-500/30"
    if (score >= 0.6) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
    return "bg-red-500/20 text-red-300 border-red-500/30"
  }

  const formatMetadata = (metadata: Record<string, any>): [string, any][] => {
    const entries = Object.entries(metadata)
    if (entries.length === 0) return []

    // Define the three most clinically relevant fields in priority order
    const clinicalFields = ['tumor_grade', 'tumor_location', 'tumor_type']

    // Filter and return only the clinically relevant fields
    const filteredEntries: [string, any][] = []

    clinicalFields.forEach(field => {
      // Try exact match first
      const exactMatch = entries.find(([key]) => key.toLowerCase() === field)
      if (exactMatch) {
        filteredEntries.push(exactMatch)
        return
      }

      // Try partial match (e.g., 'grade' for 'tumor_grade')
      const fieldSuffix = field.replace('tumor_', '')
      const partialMatch = entries.find(([key]) =>
        key.toLowerCase().includes(fieldSuffix) ||
        key.toLowerCase().replace(/[_\s]/g, '').includes(fieldSuffix)
      )
      if (partialMatch) {
        filteredEntries.push(partialMatch)
      }
    })

    return filteredEntries
  }

  // Color coding for metadata fields - all with neutral backgrounds, distinctive text colors
  const getFieldColor = (key: string) => {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '')

    switch (normalizedKey) {
      case 'tumorgrade':
      case 'grade':
        return {
          key: 'text-white',
          value: 'text-white/90',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
      case 'tumorlocation':
      case 'location':
        return {
          key: 'text-blue-300',
          value: 'text-blue-100',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
      case 'tumortype':
      case 'type':
        return {
          key: 'text-purple-300',
          value: 'text-purple-100',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
      case 'size':
      case 'tumorsize':
        return {
          key: 'text-green-300',
          value: 'text-green-100',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
      case 'confidence':
      case 'score':
        return {
          key: 'text-yellow-300',
          value: 'text-yellow-100',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
      default:
        return {
          key: 'text-cyan-300',
          value: 'text-cyan-100',
          bg: 'bg-white/5',
          border: 'border-white/10'
        }
    }
  }

  // Enhanced value formatting with color coding for specific values (clinical fields only)
  const getValueColor = (key: string, value: any) => {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '')
    const normalizedValue = String(value).toLowerCase()

    // Special color coding for tumor grade values
    if (normalizedKey === 'tumorgrade' || normalizedKey === 'grade') {
      if (normalizedValue.includes('high') || normalizedValue.includes('iv') || normalizedValue === '4') {
        return 'text-white font-semibold'
      }
      if (normalizedValue.includes('low') || normalizedValue.includes('i') || normalizedValue === '1') {
        return 'text-white/80'
      }
      // Default white for grade
      return 'text-white/90'
    }

    // Special highlighting for aggressive tumor types
    if (normalizedKey === 'tumortype' || normalizedKey === 'type') {
      if (normalizedValue.includes('glioblastoma') || normalizedValue.includes('gbm')) {
        return 'text-red-200 font-semibold'
      }
      // Default purple for type
      return 'text-purple-100'
    }

    // For location, always use blue
    if (normalizedKey === 'tumorlocation' || normalizedKey === 'location') {
      return 'text-blue-100'
    }

    // Default to field color
    return getFieldColor(key).value
  }

  // Get explicit field label color (more specific than getFieldColor)
  const getFieldLabelColor = (key: string) => {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '')

    switch (normalizedKey) {
      case 'tumorgrade':
      case 'grade':
        return 'text-white'
      case 'tumorlocation':
      case 'location':
        return 'text-blue-300'
      case 'tumortype':
      case 'type':
        return 'text-purple-300'
      default:
        return 'text-cyan-300'
    }
  }

  // Get icon for metadata field type (only for the three clinical fields)
  const getFieldIcon = (key: string) => {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, '')

    switch (normalizedKey) {
      case 'tumorgrade':
      case 'grade':
        return <TrendingUp className="h-3 w-3" />
      case 'tumorlocation':
      case 'location':
        return <MapPin className="h-3 w-3" />
      case 'tumortype':
      case 'type':
        return <Layers className="h-3 w-3" />
      default:
        return <Brain className="h-3 w-3" />
    }
  }

  const getImagePath = (caseId: string) => {
    // Extract the base case name from IDs like "BraTS20_Training_009_seg" or "BraTS20_Training_009"
    const baseName = caseId.replace('_seg', '')
    // Use overlay endpoint for FLAIR background + red segmentation overlay
    // Increased size to 256 for better quality in similarity search results
    return `/api/overlay/${baseName}?size=256`
  }

  const getFallbackImagePath = (caseId: string) => {
    // Fallback to segmentation mask only if overlay fails
    const baseName = caseId.replace('_seg', '')
    return `/images/${baseName}.png`
  }

  const getLargeImagePath = (caseId: string) => {
    // Get large overlay image for modal (512x512)
    const baseName = caseId.replace('_seg', '')
    return `/api/overlay/${baseName}?size=512`
  }

  const handleImageClick = (caseId: string, alt: string) => {
    setSelectedImage({
      src: getLargeImagePath(caseId),
      alt: alt,
      caseId: caseId
    })
  }

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }

    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [selectedImage])

  return (
    <>
      <Card className="border-blue-500/30 bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-300">
          <Search className="h-5 w-5" />
          Similar Cases Found
          <Badge variant="outline" className="ml-auto border-blue-500/30 text-blue-300">
            {results.length} match{results.length !== 1 ? 'es' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-blue-200/80 mb-4">
          Based on tumor segmentation pattern analysis using CLIP embeddings. Images show red segmentation overlays on FLAIR backgrounds.
        </div>

        {/* Color Legend for Clinical Metadata Fields */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="text-sm font-medium text-white/90 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            Clinical Metadata Guide
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/10 border border-white/20 rounded flex items-center justify-center">
                <TrendingUp className="h-2 w-2 text-white" />
              </div>
              <span className="text-white">Tumor Grade</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/10 border border-white/20 rounded flex items-center justify-center">
                <MapPin className="h-2 w-2 text-blue-300" />
              </div>
              <span className="text-blue-300">Tumor Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-white/10 border border-white/20 rounded flex items-center justify-center">
                <Layers className="h-2 w-2 text-purple-300" />
              </div>
              <span className="text-purple-300">Tumor Type</span>
            </div>
          </div>
        </div>

        {/* Horizontal layout for similar cases */}
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {results.map((match, index) => (
            <Card key={match.id} className="border-white/10 bg-background/40 flex-shrink-0 w-80 min-w-80 shadow-lg hover:shadow-xl transition-all duration-200 hover:border-blue-400/30">
              <CardContent className="p-6">
                {/* Header with case name and match score */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-white/90 text-lg">
                      {match.case_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>
                  </div>
                </div>

                {/* Match score badge */}
                <div className="mb-4">
                  <Badge
                    className={`${getScoreColor(match.score)} text-sm font-medium px-3 py-1`}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {formatScore(match.score)}% match
                  </Badge>
                </div>

                {/* Image */}
                <div className="mb-4">
                  <div
                    className="w-full aspect-square rounded-lg overflow-hidden border border-white/20 bg-black/50 cursor-pointer hover:border-blue-400/50 transition-colors relative group"
                    onClick={() => handleImageClick(match.case_name, `${match.case_name} overlay`)}
                  >
                    <img
                      src={getImagePath(match.case_name)}
                      alt={`${match.case_name} overlay`}
                      className="w-full h-full object-contain medical-image"
                      onError={(e) => {
                        // Try fallback to segmentation mask only
                        const fallbackSrc = getFallbackImagePath(match.case_name)
                        if (e.currentTarget.src !== fallbackSrc) {
                          e.currentTarget.src = fallbackSrc
                          e.currentTarget.alt = `${match.case_name} segmentation`
                        } else {
                          // Both overlay and fallback failed, show icon
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }
                      }}
                    />
                    <div className="hidden flex items-center justify-center w-full h-full text-white/50 text-xs">
                      <Brain className="h-8 w-8" />
                    </div>

                    {/* Zoom overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Metadata - Vertical layout with color coding */}
                {Object.keys(match.metadata).length > 0 && (
                  <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="space-y-3">
                      {formatMetadata(match.metadata).map(([key, value], metaIndex) => {
                        const fieldColors = getFieldColor(key)
                        const fieldLabelColor = getFieldLabelColor(key)
                        const valueColor = getValueColor(key, value)
                        const isHighPriority = valueColor.includes('font-semibold')

                        return (
                          <div
                            key={metaIndex}
                            className={`metadata-card p-3 rounded-lg ${fieldColors.bg} ${fieldColors.border} border transition-all duration-300 hover:bg-opacity-40 hover:scale-[1.02] hover:shadow-lg ${isHighPriority ? 'ring-1 ring-white/20' : ''}`}
                            style={{
                              animationDelay: `${metaIndex * 100}ms`
                            }}
                          >
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-2">
                                <span className={`transition-transform duration-200 hover:scale-110 ${fieldLabelColor}`}>
                                  {getFieldIcon(key)}
                                </span>
                                <span className={`font-semibold text-xs uppercase tracking-wide ${fieldLabelColor}`}>
                                  {key.replace(/_/g, ' ')}
                                </span>
                                {isHighPriority && (
                                  <div className="ml-auto">
                                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                  </div>
                                )}
                              </div>
                              <span className={`font-medium text-sm pl-5 transition-colors duration-200 ${valueColor}`}>
                                {value}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Footer note */}
                <div className="pt-3 border-t border-white/10">
                  <div className="text-xs text-white/50 text-center">
                    Similarity based on tumor shape, location, and segmentation patterns
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-4 p-3 rounded-lg bg-blue-950/30 border border-blue-500/20">
          <div className="text-xs text-blue-200/80">
            <strong>Note:</strong> Similarity scores are based on CLIP embeddings of segmentation masks.
            Higher scores indicate more similar tumor patterns and locations.
          </div>
        </div>
        </CardContent>
      </Card>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Large image */}
            <div className="relative bg-black/50 rounded-lg overflow-hidden border border-white/20">
              <img
                src={selectedImage.src}
                alt={selectedImage.alt}
                className="max-w-full max-h-[80vh] object-contain medical-image"
                onClick={(e) => e.stopPropagation()}
                onError={(e) => {
                  // Fallback to segmentation mask if overlay fails
                  const fallbackSrc = getFallbackImagePath(selectedImage.caseId)
                  if (e.currentTarget.src !== fallbackSrc) {
                    e.currentTarget.src = fallbackSrc
                  }
                }}
              />

              {/* Image info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <div className="text-white font-medium">{selectedImage.caseId}</div>
                <div className="text-white/70 text-sm">FLAIR background with red segmentation overlay</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
