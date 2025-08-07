import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Filters() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6 ">
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Patient Name</div>
        <Input
          placeholder="Search among records"
          className="mt-1 h-9 border-white/30 bg-background/70 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Patient ID</div>
        <Input
          placeholder="Search among records"
          className="mt-1 h-9 border-white/30 bg-background/70 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Study Date/Time</div>
        <Input
          placeholder="Search among records"
          className="mt-1 h-9 border-white/30 bg-background/70 text-white placeholder:text-white/50 focus-visible:ring-white/30 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Modality</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-white/30 bg-background/70 text-white focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="mr">MR</SelectItem>
            <SelectItem value="ct">CT</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Scanner</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-white/30 bg-background/70 text-white focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="room1">MRI Room 1</SelectItem>
            <SelectItem value="room2">MRI Room 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/80">Triage</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-white/30 bg-background/70 text-white focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}


