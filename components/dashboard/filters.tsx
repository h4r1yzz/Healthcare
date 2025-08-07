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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Location</div>
        <Select>
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Frontal">Frontal</SelectItem>
            <SelectItem value="Parietal">Parietal</SelectItem>
            <SelectItem value="Temporal">Temporal</SelectItem>
            <SelectItem value="Occipital">Occipital</SelectItem>
            <SelectItem value="Cerebellum">Cerebellum</SelectItem>
            <SelectItem value="Brainstem">Brainstem</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Type</div>
        <Select>
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Glioma">Glioma</SelectItem>
            <SelectItem value="Meningioma">Meningioma</SelectItem>
            <SelectItem value="Metastasis">Metastasis</SelectItem>
            <SelectItem value="Pituitary adenoma">Pituitary Adenoma</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Grade</div>
        <Select>
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="Grade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="I">I</SelectItem>
            <SelectItem value="II">II</SelectItem>
            <SelectItem value="III">III</SelectItem>
            <SelectItem value="IV">IV</SelectItem>
            <SelectItem value="Unknown">Unknown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white">Size</div>
        <Select>
          <SelectTrigger className="mt-1 h-9 border-gray-300 bg-white text-black focus:ring-0"><SelectValue placeholder="Size" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="<10cm³">&lt;10cm³</SelectItem>
            <SelectItem value="10-50cm³">10-50cm³</SelectItem>
            <SelectItem value=">50cm³">&gt;50cm³</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}


