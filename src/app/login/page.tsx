'use client'
import { AuthForm } from '@/components/auth/AuthForm'
import Image from 'next/image'
import FrameBg from '@/assets/Frame100000.png'
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function LoginContent() {
  // Hook must be called inside a Suspense boundary
  useSearchParams()
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const reason = params.get('reason')
      if (reason === 'expired') {
        toast('Session expired. Please log in again.', { icon: '⚠️' })
        window.history.replaceState({}, document.title, '/login')
      }
    }
  }, [])
  return (
    <div className="relative z-10">
      <AuthForm />
    </div>
  )
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FFFCF6] relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 w-full h-full z-0">
        <Image
          src={FrameBg}
          alt="Background"
          fill
          style={{ objectFit: 'cover' }}
          className="pointer-events-none select-none"
          priority
          sizes="100vw"
        />
      </div>
      <Suspense fallback={<div className="relative z-10">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </main>
  )
}
