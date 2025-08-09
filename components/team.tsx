'use client'

import { Linkedin, Mail } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Image from 'next/image'

// TypeScript interface for team member data
interface TeamMember {
  id: string
  name: string
  role: string
  bio: string
  avatar: string
  linkedin?: string
  email?: string
}

// Team member data
const teamMembers: TeamMember[] = [
  {
    id: "1",
    name: "Harry Chandra Tsjan",
    role: "Chief Executive Officer & Co-Founder",
    bio: "Leading neurologist with 15+ years of experience in brain tumor diagnosis and treatment. Pioneered several AI-assisted diagnostic protocols in major medical centers.",
    avatar: "/team/harry.jpeg",
    linkedin: "https://www.linkedin.com/in/harry-chandra-180870179/",
    email: "harrychandra@neurograde.ai"
  },
  {
    id: "2",
    name: "Tham Chie Weng",
    role: "Chief Technology Officer & Co-Founder",
    bio: "Former Google AI researcher specializing in medical imaging and machine learning. Published 50+ papers on computer vision applications in healthcare.",
    avatar: "/team/chieweng.jpeg",
    linkedin: "https://www.linkedin.com/in/chie-weng-tham/",
    email: "chieweng.lim@neurograde.ai"
  },
  {
    id: "3",
    name: "Muthuraman Palaniappan",
    role: "Head of Clinical Research",
    bio: "Board-certified radiologist with expertise in neuroimaging and AI validation. Led clinical trials for multiple FDA-approved medical AI systems.",
    avatar: "/team/muthu.jpeg",
    linkedin: "https://www.linkedin.com/in/muthuraman-palaniappan-83b12324b/",
    email: "muthu@neurograde.ai"
  },
  {
    id: "4",
    name: "Zuhair",
    role: "Senior AI Research Scientist",
    bio: "PhD in Computer Science from Stanford with focus on deep learning for medical applications. Expert in neural networks and image analysis algorithms.",
    avatar: "/team/zuhair.jpeg",
    linkedin: "https://www.linkedin.com/in/zuhairaziz/",
    email: "zuhair.ahmad@neurograde.ai"
  }
]

export default function Team() {
  return (
    <section className="container space-y-16 py-24 md:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-5xl">Meet Our Team</h2>
        <p className="mt-4 text-muted-foreground sm:text-lg">
          Our world-class team of medical professionals and AI researchers is dedicated to advancing neurological diagnostics through cutting-edge technology.
        </p>
      </div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {teamMembers.map((member) => (
          <div key={member.id} className="group relative overflow-hidden rounded-lg border bg-background p-8 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Image
                  src={member.avatar}
                  alt={`${member.name} - ${member.role}`}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                {/* Fallback initials (hidden by default, shown if image fails) */}
                <span
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-white/90"
                  style={{ display: 'none' }}
                >
                  {member.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              
              {/* Name and Role */}
              <div className="space-y-1">
                <h3 className="font-bold text-xl text-white/90">{member.name}</h3>
                <p className="text-blue-400 font-medium">{member.role}</p>
              </div>
              
              {/* Bio */}
              <p className="text-muted-foreground text-sm leading-relaxed">
                {member.bio}
              </p>
              
              {/* Social Links */}
              <div className="flex gap-2 pt-2">
                {member.linkedin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400"
                    asChild
                  >
                    <a href={member.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.email && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-400"
                    asChild
                  >
                    <a href={`mailto:${member.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
