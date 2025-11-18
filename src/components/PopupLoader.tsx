"use client"
import React from 'react'

type PopupLoaderProps = {
  open: boolean
  label?: string
}

export default function PopupLoader({ open, label = 'Please wait…' }: PopupLoaderProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div className="relative z-[1001] rounded-xl bg-white shadow-2xl border border-white/60 px-6 py-5 flex items-center gap-4">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[#714B90] border-t-transparent" />
        <span className="text-sm font-medium text-gray-800">{label}</span>
      </div>
    </div>
  )
}



