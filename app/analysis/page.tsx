import Navbar from "@/components/navbar"
import UploadPanel from "@/components/analysis/upload-panel"

export default function AnalysisPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="container max-w-screen-2xl py-8 md:py-12">
          <UploadPanel />
        </main>
      </div>
    </div>
  )
}


