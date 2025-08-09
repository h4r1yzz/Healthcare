import "./globals.css"
import type React from "react"
import type { Metadata } from "next"
import MouseMoveEffect from "@/components/mouse-move-effect"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "NeuroGrade AI",
  description: "NeuroGrade AI delivers innovative, high-performance software solutions for businesses of the future.",
  icons: {
    icon: [
      { url: "/icon/icons8-brain-forma-thin-filled-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon/icons8-brain-forma-thin-filled-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon/icons8-brain-forma-thin-filled-96.png", sizes: "96x96", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="text-foreground antialiased">
        <MouseMoveEffect />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
