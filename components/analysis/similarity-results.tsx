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
    if (entries.length === 0) return "No metadata available"

    return entries
      .slice(0, 3) // Show only first 3 metadata fields
      .map(([key, value]) => `${key}: ${value}`)
      .join(" • ")
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
        
        <div className="grid gap-4">
          {results.map((match, index) => (
            <Card key={match.id} className="border-white/10 bg-background/40">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Left: Image */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-32 h-32 rounded-lg overflow-hidden border border-white/20 bg-black/50 cursor-pointer hover:border-blue-400/50 transition-colors relative group"
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

                  {/* Right: Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white/90">
                          {match.case_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                      <Badge
                        className={`${getScoreColor(match.score)} text-xs font-medium`}
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatScore(match.score)}% match
                      </Badge>
                    </div>

                    <div className="text-sm text-white/70 mb-3">
                      <span className="font-medium">Case ID:</span> {match.id}
                    </div>

                    {Object.keys(match.metadata).length > 0 && (
                      <div className="text-sm text-white/60">
                        <span className="font-medium text-white/80">Metadata:</span>{" "}
                        {formatMetadata(match.metadata)}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="text-xs text-white/50">
                        Similarity based on tumor shape, location, and segmentation patterns
                      </div>
                    </div>
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
