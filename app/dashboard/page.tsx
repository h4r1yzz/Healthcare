import Navbar from "@/components/navbar"
import Topbar from "@/components/dashboard/topbar"
import Filters from "@/components/dashboard/filters"
import StudyTable from "@/components/dashboard/study-table"
import type { Study } from "@/components/dashboard/study-row"

const unread: Study[] = [
  { patientName: "Aisyah Binti Rahman", patientId: "240795-1088", dateTime: "07/02/2024 08:50", location: "Frontal", type: "Glioma", grade: "II", size: "10-50cm³", triage: "Normal" },
  { patientName: "Tan Wei Jie", patientId: "101186-2079", dateTime: "05/02/2024 11:45", location: "Parietal", type: "Meningioma", grade: "I", size: "<10cm³", triage: "Normal" },
  { patientName: "Saraswathy A/P Muniandy", patientId: "040674-3492", dateTime: "03/02/2024 14:30", location: "Temporal", type: "Metastasis", grade: "III", size: ">50cm³", triage: "Normal" },
  { patientName: "Nicholas A. Kadazan", patientId: "180890-1455", dateTime: "02/02/2024 09:10", location: "Occipital", type: "Pituitary adenoma", grade: "Unknown", size: "10-50cm³", triage: "Normal" },
  { patientName: "Nurul Ain Binti Zulkifli", patientId: "290901-2340", dateTime: "01/02/2024 17:22", location: "Cerebellum", type: "Other", grade: "II", size: "<10cm³", triage: "Normal" },
  { patientName: "Chong Li Ling", patientId: "220996-4521", dateTime: "30/01/2024 13:55", location: "Brainstem", type: "Glioma", grade: "IV", size: ">50cm³", triage: "Normal" },
  { patientName: "Rajiv A/L Subramaniam", patientId: "091083-7741", dateTime: "28/01/2024 15:18", location: "Frontal", type: "Meningioma", grade: "I", size: "10-50cm³", triage: "Normal" },
];

const read: Study[] = [
  { patientName: "Zulkarnain Bin Hashim", patientId: "120665-5538", dateTime: "06/02/2024 16:35", location: "Parietal", type: "Metastasis", grade: "III", size: ">50cm³", triage: "High" },
  { patientName: "Lim Mei Fen", patientId: "050391-4027", dateTime: "03/02/2024 10:05", location: "Temporal", type: "Glioma", grade: "IV", size: "10-50cm³", triage: "High" },
  { patientName: "Deepa A/P Narayanan", patientId: "070582-8832", dateTime: "31/01/2024 08:40", location: "Frontal", type: "Meningioma", grade: "II", size: "<10cm³", triage: "Medium" },
  { patientName: "Jerome Anak Ding", patientId: "300877-6384", dateTime: "29/01/2024 18:15", location: "Occipital", type: "Other", grade: "Unknown", size: "10-50cm³", triage: "High" },
  { patientName: "Noraini Binti Saad", patientId: "211278-9430", dateTime: "27/01/2024 12:25", location: "Cerebellum", type: "Pituitary adenoma", grade: "I", size: ">50cm³", triage: "Medium" },
];

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
        <div className="absolute right-0 top-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] bg-white/5 blur-[100px]" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <Topbar />
        <main className="container max-w-screen-2xl py-8 md:py-12">
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


