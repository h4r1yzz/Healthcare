"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Search, TrendingUp, X, ZoomIn } from "lucide-react"
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

  const formatMetadata = (metadata: Record<string, any>) => {
    const entries = Object.entries(metadata)
    if (entries.length === 0) return []

    return entries.slice(0, 4) // Show up to 4 metadata fields for vertical display
  }

  const getImagePath = (caseId: string) => {
    // Extract the base case name from IDs like "BraTS20_Training_009_seg" or "BraTS20_Training_009"
    const baseName = caseId.replace('_seg', '')
    // Use overlay endpoint for FLAIR background + red segmentation overlay
    return `/api/overlay/${baseName}?size=128`
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
                    className="w-full h-48 rounded-lg overflow-hidden border border-white/20 bg-black/50 cursor-pointer hover:border-blue-400/50 transition-colors relative group"
                    onClick={() => handleImageClick(match.case_name, `${match.case_name} overlay`)}
                  >
                    <img
                      src={getImagePath(match.case_name)}
                      alt={`${match.case_name} overlay`}
                      className="w-full h-full object-cover"
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

                {/* Case ID */}
                <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm">
                    <span className="font-medium text-blue-300">case_id:</span>
                    <span className="text-white/80 ml-2">{match.id}</span>
                  </div>
                </div>

                {/* Metadata - Vertical layout */}
                {Object.keys(match.metadata).length > 0 && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="space-y-2">
                      {formatMetadata(match.metadata).map(([key, value], metaIndex) => (
                        <div key={metaIndex} className="text-sm">
                          <span className="font-medium text-blue-300">{key}:</span>
                          <span className="text-white/80 ml-2">{value}</span>
                        </div>
                      ))}
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
                className="max-w-full max-h-[80vh] object-contain"
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
