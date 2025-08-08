import "./globals.css"
import type React from "react"
import type { Metadata } from "next"
import MouseMoveEffect from "@/components/mouse-move-effect"

export const metadata: Metadata = {
  title: "MedScan",
  description: "MedScan delivers innovative, high-performance software solutions for businesses of the future."
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
      </body>
    </html>
  )
}
