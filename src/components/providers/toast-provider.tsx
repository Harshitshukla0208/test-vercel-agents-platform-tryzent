'use client'
import { Toaster } from 'react-hot-toast'

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#ffffff',
          color: '#000000',
          border: '1px solid #e5e7eb',
        },
        success: {
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#10B981',
            border: '1px solid #10B981',
          },
        },
        error: {
          duration: 5000,
          style: {
            background: '#ffffff',
            color: '#EF4444',
            border: '1px solid #EF4444',
          },
        },
      }}
    />
  )
}
