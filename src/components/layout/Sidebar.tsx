'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',                icon: 'dashboard',      label: 'Dashboard' },
  { href: '/dashboard/wachtlijst',     icon: 'pending_actions', label: 'Wachtlijst' },
  { href: '/dashboard/kindplanning',   icon: 'calendar_month', label: 'Kindplanning' },
  { href: '/dashboard/kinderen',       icon: 'child_care',     label: 'Kinderen' },
  { href: '/dashboard/facturen',       icon: 'receipt_long',   label: 'Facturen' },
  { href: '/locaties',                 icon: 'location_on',    label: 'Locaties' },
  { href: '/rapportages',              icon: 'bar_chart',      label: 'Rapportages' },
  { href: '/instellingen',             icon: 'settings',       label: 'Instellingen' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="h-screen w-64 fixed left-0 top-0 z-50 flex flex-col p-4 gap-2 border-r"
      style={{ background: '#F5F3F0', borderColor: '#E8E4DF' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-4 mb-2">
        <Image src="/penguin-logo.png" alt="Penguin Place logo" width={40} height={40} className="object-contain" unoptimized />
        <div>
          <h1
            className="text-lg font-black leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#2D2540' }}
          >
            Penguin Place
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#9B8FCE' }}>
            Kinderopvang
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
              style={
                active
                  ? { background: 'white', color: '#6B5B95', boxShadow: '0 1px 3px rgba(91,82,212,0.12)' }
                  : { color: '#8B82A8' }
              }
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#6B5B95'
                  ;(e.currentTarget as HTMLElement).style.background = '#EDE9F8'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#8B82A8'
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Help */}
      <div className="pt-4" style={{ borderTop: '1px solid #E8E4DF' }}>
        <Link
          href="/help"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ color: '#8B82A8' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#6B5B95'
            ;(e.currentTarget as HTMLElement).style.background = '#EDE9F8'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#8B82A8'
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
          }}
        >
          <span className="material-symbols-outlined text-xl">help</span>
          Help Center
        </Link>
      </div>
    </aside>
  )
}
