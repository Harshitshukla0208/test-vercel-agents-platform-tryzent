// src/app/page.tsx
"use client"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { PlatformPreview } from "@/components/platform-preview"
import { FeaturesSection } from "@/components/features-section"
import { TargetAudience } from "@/components/target-audience"
import Footer from "@/components/footer"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/utils/auth"
import { CTAsection } from "@/components/CTAsection"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const maybeRedirect = async () => {
      if (!isAuthenticated()) return
      try {
        const res = await fetch('/api/get-user-profile', { method: 'GET' })
        if (!res.ok) return
        const data = await res.json()
        const hasProfile = !!(data?.data?.profile?.first_name && data?.data?.profile?.profile_id)
        if (hasProfile) {
          router.replace('/dashboard')
        }
      } catch {
        // Fail silently; stay on home
      }
    }
    maybeRedirect()
  }, [router])

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <PlatformPreview />
      <FeaturesSection />
      <TargetAudience />
      <CTAsection />
      <Footer />
    </main>
  )
}
