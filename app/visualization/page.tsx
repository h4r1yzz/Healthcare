import Navbar from "@/components/navbar"
import NiftiViewer from "@/components/visualization/nifti-viewer"

export default function VisualizationPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-purple-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="container max-w-screen-2xl py-8 md:py-12">
          <NiftiViewer />
        </main>
      </div>
    </div>
  )
}


