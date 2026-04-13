'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error.message, error.digest, error)
  }, [error])

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: '#F5F3F0' }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 max-w-md w-full p-8 text-center">
        <h2
          className="text-lg font-bold mb-2"
          style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
        >
          Er is iets misgegaan
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Er is een onverwachte fout opgetreden. Probeer het opnieuw of neem
          contact op met ondersteuning als het probleem aanhoudt.
        </p>
        <p className="text-xs text-slate-400 mb-4 font-mono select-all">
          {error.digest ?? error.message ?? 'onbekende fout'}
        </p>
        <button
          onClick={() => unstable_retry()}
          className="px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-all active:scale-95"
          style={{ background: 'linear-gradient(to right, #6B5B95, #9B8FCE)' }}
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  )
}
