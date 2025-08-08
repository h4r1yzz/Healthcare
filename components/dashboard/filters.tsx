import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function Filters() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6 text-black">
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Patient Name</div>
        <Input
          placeholder="Patient Name"
          className="mt-1 h-9 border-gray-300 bg-white text-black placeholder:text-muted-foreground focus-visible:ring-black/20 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Patient ID</div>
        <Input
          placeholder="Patient ID"
          className="mt-1 h-9 border-gray-300 bg-white text-black placeholder:text-muted-foreground focus-visible:ring-black/20 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Study Date/Time</div>
        <Input
          placeholder="Date/Time"
          className="mt-1 h-9 border-gray-300 bg-white text-black placeholder:text-muted-foreground focus-visible:ring-black/20 focus-visible:ring-offset-0"
        />
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Modality</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="mr">MR</SelectItem>
            <SelectItem value="ct">CT</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Scanner</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="room1">MRI Room 1</SelectItem>
            <SelectItem value="room2">MRI Room 2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Triage</div>
        <Select defaultValue="all">
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="All" /></SelectTrigger>
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


