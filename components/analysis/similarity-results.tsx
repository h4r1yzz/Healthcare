"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Search, TrendingUp } from "lucide-react"

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

  return (
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
          Based on tumor segmentation pattern analysis using CLIP embeddings
        </div>
        
        <div className="grid gap-4">
          {results.map((match, index) => (
            <Card key={match.id} className="border-white/10 bg-background/40">
              <CardContent className="p-4">
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
  )
}
