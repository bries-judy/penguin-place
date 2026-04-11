'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-1">
            <Image src="/penguin-logo.png" alt="Penguin Place logo" width={64} height={64} className="object-contain" />
          </div>
          <CardTitle className="text-xl">Penguin Place</CardTitle>
          <p className="text-sm" style={{ color: '#8B82A8' }}>Kindplanning & Capaciteit</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid #C8C2D8', color: '#2D2540' }} onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #9B8FCE'} onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                placeholder="naam@organisatie.nl"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Wachtwoord</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2" style={{ border: '1px solid #C8C2D8', color: '#2D2540' }} onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #9B8FCE'} onBlur={e => e.currentTarget.style.boxShadow = 'none'}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Inloggen...' : 'Inloggen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
