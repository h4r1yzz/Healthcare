import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, Monitor, Search, User2 } from "lucide-react"

export default function Topbar() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-b-md border-b border-border/60 bg-background/70 p-3">
      <div className="flex items-center gap-3">
        <div className="font-semibold">Study List</div>
        <Select defaultValue="all">
          <SelectTrigger className="h-8 w-[160px]"><SelectValue placeholder="Select scanner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scanners</SelectItem>
            <SelectItem value="room1">MRI Room 1</SelectItem>
            <SelectItem value="room2">MRI Room 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden text-sm text-muted-foreground md:block">Date: 09/08/2025</div>
      </div>
    </div>
  )
}


