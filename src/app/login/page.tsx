'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Onjuist e-mailadres of wachtwoord')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F5F3F0' }}>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 w-full max-w-sm mx-4 p-8">

        {/* Logo + titel */}
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/penguin-logo.png"
            alt="Penguin Place logo"
            width={64}
            height={64}
            className="object-contain mb-3"
          />
          <h1
            className="text-xl font-black leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
          >
            Penguin Place
          </h1>
          <p className="text-sm font-bold uppercase tracking-widest mt-0.5" style={{ color: '#9B8FCE' }}>
            Kinderopvang
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              E-mailadres
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="naam@organisatie.nl"
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30"
              style={{ border: '1px solid #E8E4DF', color: '#2D2540', background: 'white' }}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Wachtwoord
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9B8FCE]/30"
              style={{ border: '1px solid #E8E4DF', color: '#2D2540', background: 'white' }}
            />
          </div>

          {error && (
            <p className="text-sm text-[#ba1a1a] bg-[#ba1a1a]/10 px-4 py-2 rounded-xl">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 mt-2"
            style={{ background: 'linear-gradient(to right, #6B5B95, #9B8FCE)' }}
          >
            {loading ? 'Inloggen…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
