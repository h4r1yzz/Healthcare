import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Brain } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center gap-3">
          <Brain className="h-5 w-5 text-[#0971e7]" />
          <span className="font-semibold">NeuroGrade AI</span>
          <span className="hidden sm:inline text-muted-foreground text-sm pl-3 border-l border-border/60">
            Multi-Modal Brain Tumor Grading
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-sm font-medium">
          <Link href="/dashboard" className="transition-colors text-foreground/80 hover:text-foreground">
            Dashboard
          </Link>
          <Link href="/cases" className="transition-colors text-foreground/80 hover:text-foreground">
            Cases
          </Link>
          <Link href="/reports" className="transition-colors text-foreground/80 hover:text-foreground">
            Reports
          </Link>
          <Link href="/analysis" className="ml-2">
            <Button size="sm">
              New Analysis
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
