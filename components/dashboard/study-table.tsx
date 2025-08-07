import StudyRow, { type Study } from "./study-row"

type Props = {
  title: string
  studies: Study[]
}

export default function StudyTable({ title, studies }: Props) {
  return (
    <div className="overflow-hidden rounded-md border border-white/30 bg-background/70 shadow-sm">
      <div className="border-b border-white/30 bg-background/80 px-3 py-2 text-sm font-semibold tracking-wide text-white/90">
        {title}
      </div>
      <div className="grid grid-cols-12 border-b border-white/20 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="col-span-2">Patient Name</div>
        <div className="col-span-2">Patient ID</div>
        <div className="col-span-2">Study Date/Time</div>
        <div className="col-span-1">Location</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1">Grade</div>
        <div className="col-span-1">Size</div>
        <div className="col-span-1">Triage</div>
      </div>
      <div>
        {studies.map((s, i) => (
          <StudyRow key={i} study={s} />
        ))}
      </div>
    </div>
  )
}


