import StatusDot from "./status-dot"

export type Study = {
  patientName: string
  patientId: string
  dateTime: string
  location: string
  type: string
  grade: string
  size: string
  triage: "Normal" | "High" | "Medium"
  disclaimer?: string
}

export default function StudyRow({ study }: { study: Study }) {
  const color = study.triage === "High" ? "red" : study.triage === "Medium" ? "yellow" : "green"
  return (
    <div className="grid grid-cols-12 items-center border-b border-white/10 px-3 py-3 text-sm hover:bg-white/5">
      <div className="col-span-2 min-w-0 truncate">{study.patientName}</div>
      <div className="col-span-2 min-w-0 truncate">{study.patientId}</div>
      <div className="col-span-2 min-w-0 truncate">{study.dateTime}</div>
      <div className="col-span-1 min-w-0 truncate">{study.location}</div>
      <div className="col-span-2 min-w-0 truncate">{study.type}</div>
      <div className="col-span-1 min-w-0 truncate">{study.grade}</div>
      <div className="col-span-1 min-w-0 truncate">{study.size}</div>
      <div className="col-span-1 flex items-center justify-start gap-2">
        <StatusDot color={color as any} label={study.triage} />
      </div>
    </div>
  )
}


