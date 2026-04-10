'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard',               icon: 'dashboard',      label: 'Dashboard' },
  { href: '/dashboard/wachtlijst',    icon: 'pending_actions', label: 'Wachtlijst' },
  { href: '/dashboard/kindplanning',  icon: 'calendar_month', label: 'Kindplanning' },
  { href: '/dashboard/kinderen',      icon: 'child_care',     label: 'Kinderen' },
  { href: '/locaties',                icon: 'location_on',    label: 'Locaties' },
  { href: '/rapportages',             icon: 'bar_chart',      label: 'Rapportages' },
  { href: '/instellingen',            icon: 'settings',       label: 'Instellingen' },
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
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
          style={{ background: '#5B52D4' }}
        >
          <span className="material-symbols-outlined text-xl">child_care</span>
        </div>
        <div>
          <h1
            className="text-lg font-black leading-tight"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#1E1A4B' }}
          >
            Penguin Place
          </h1>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#A09CC0' }}>
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
                  ? { background: 'white', color: '#5B52D4', boxShadow: '0 1px 3px rgba(91,82,212,0.12)' }
                  : { color: '#7A7594' }
              }
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#5B52D4'
                  ;(e.currentTarget as HTMLElement).style.background = '#EAE8FD'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = '#7A7594'
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
          style={{ color: '#7A7594' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#5B52D4'
            ;(e.currentTarget as HTMLElement).style.background = '#EAE8FD'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.color = '#7A7594'
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
