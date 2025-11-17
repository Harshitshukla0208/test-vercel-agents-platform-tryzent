"use client"
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

type PopupLoaderProps = {
  open: boolean
  label?: string
}

export default function PopupLoader({ open, label = 'Please wait…' }: PopupLoaderProps) {
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Prevent scroll and interactions when loader is open
  useEffect(() => {
    if (open && mounted) {
      const originalOverflow = document.body.style.overflow
      const originalPaddingRight = document.body.style.paddingRight
      
      // Get scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      
      // Lock the body
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      
      return () => {
        // Restore original styles
        document.body.style.overflow = originalOverflow
        document.body.style.paddingRight = originalPaddingRight
      }
    }
  }, [open, mounted])

  if (!open || !mounted) return null
  
  const loaderElement = (
    <div
      data-loader-portal
      className="fixed inset-0 flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{ 
        zIndex: 2147483647,
        isolation: 'isolate'
      }}
    >
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
      />
      
      {/* Loader card */}
      <div 
        className="relative rounded-xl bg-white shadow-2xl border border-white/60 px-6 py-5 flex items-center gap-4"
        style={{ 
          zIndex: 2147483647
        }}
      >
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#714B90] border-t-transparent" />
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
    </div>
  )

  // Render directly to body using portal
  return createPortal(loaderElement, document.body)
}