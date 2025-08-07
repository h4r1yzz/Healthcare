import Navbar from "@/components/navbar"
import Topbar from "@/components/dashboard/topbar"
import Filters from "@/components/dashboard/filters"
import StudyTable from "@/components/dashboard/study-table"
import type { Study } from "@/components/dashboard/study-row"

const unread: Study[] = [
  { patientName: "Elena Flint Austin", patientId: "161069-2466", dateTime: "11/02/2024 13:35", modality: "MR", scanner: "MRI Room 2", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Mohammad M. Koch", patientId: "100499-4473", dateTime: "04/02/2024 16:10", modality: "MR", scanner: "MRI Room 2", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Eduardo E. Gonzales", patientId: "100577-3993", dateTime: "01/02/2024 07:25", modality: "MR", scanner: "MRI Room 1", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Marcel Yves Dupont", patientId: "070885-2163", dateTime: "01/02/2024 06:16", modality: "MR", scanner: "MRI Room 2", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Nicklas S. Lorenzen", patientId: "300153-1025", dateTime: "30/01/2024 20:16", modality: "MR", scanner: "MRI Room 1", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Victoria Laura Gulbrandsen", patientId: "210981-4752", dateTime: "30/01/2024 18:47", modality: "MR", scanner: "MRI Room 1", summary: "No suspected findings", triage: "Normal" },
  { patientName: "Dean Thorne", patientId: "220764-2927", dateTime: "29/01/2024 10:42", modality: "MR", scanner: "MRI Room 2", summary: "No suspected findings", triage: "Normal" },
]

const read: Study[] = [
  { patientName: "Frederik P. Gregersen", patientId: "230756-3633", dateTime: "10/02/2024 11:46", modality: "MR", scanner: "MRI Room 2", summary: "Suspicion of infarct", triage: "High" },
  { patientName: "Line K. Hermansen", patientId: "020438-0376", dateTime: "01/02/2024 05:25", modality: "MR", scanner: "MRI Room 1", summary: "Suspicion of hemorrhage", triage: "High" },
  { patientName: "Katrine B. Juhl", patientId: "020885-2604", dateTime: "31/01/2024 16:57", modality: "MR", scanner: "MRI Room 1", summary: "Suspicion of infarct, suspicion of hemorrhage", triage: "High" },
  { patientName: "Amanda A. Olesen", patientId: "250476-0920", dateTime: "29/01/2024 10:40", modality: "MR", scanner: "MRI Room 1", summary: "Suspicion of infarct, suspicion of hemorrhage", triage: "High" },
  { patientName: "Thea W. Vestergaard", patientId: "160696-0294", dateTime: "15/02/2024 11:33", modality: "MR", scanner: "MRI Room 2", summary: "Suspicion of tumor", triage: "Medium" },
]

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <Topbar />
        <main className="container max-w-screen-2xl py-6">
          <div className="rounded-md border border-white/30 bg-background/60 p-4">
            <Filters />
          </div>

          <div className="mt-6 space-y-6">
            <StudyTable title={`Number of UNREAD STUDIES: ${unread.length} of ${unread.length + read.length}`} studies={unread} />
            <StudyTable title={`Number of READ STUDIES: ${read.length} of ${unread.length + read.length}`} studies={read} />
          </div>
        </main>
      </div>
    </div>
  )
}


