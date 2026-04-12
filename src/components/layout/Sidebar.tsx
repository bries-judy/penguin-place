'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Clock,
  FileText,
  Baby,
  FileSignature,
  CalendarDays,
  Receipt,
  MapPin,
  UsersRound,
  UserCog,
  Shield,
  Settings,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Instroom',
    items: [
      { href: '/dashboard/wachtlijst', icon: Clock, label: 'Wachtlijst' },
      { href: '/dashboard/aanbiedingen', icon: FileText, label: 'Aanbiedingen' },
    ],
  },
  {
    label: 'Kinderen & Contracten',
    items: [
      { href: '/dashboard/kinderen', icon: Baby, label: 'Kinderen' },
      { href: '/dashboard/contracten', icon: FileSignature, label: 'Contracten' },
    ],
  },
  {
    label: 'Planning & Capaciteit',
    items: [
      { href: '/dashboard/kindplanning', icon: CalendarDays, label: 'Planning' },
    ],
  },
  {
    label: 'Financiën',
    items: [
      { href: '/dashboard/facturen', icon: Receipt, label: 'Facturen' },
    ],
  },
  {
    label: 'Structuur',
    items: [
      { href: '/dashboard/locaties', icon: MapPin, label: 'Locaties' },
      { href: '/dashboard/groepen', icon: UsersRound, label: 'Groepen' },
    ],
  },
  {
    label: 'Beheer',
    items: [
      { href: '/dashboard/gebruikers', icon: UserCog, label: 'Gebruikers' },
      { href: '/dashboard/rollen', icon: Shield, label: 'Rollen & rechten' },
      { href: '/dashboard/instellingen', icon: Settings, label: 'Instellingen' },
    ],
  },
]

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

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

      {/* Dashboard home */}
      <nav className="flex flex-col gap-1">
        <NavLink href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive(pathname, '/dashboard')} />
      </nav>

      {/* Grouped nav */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="mt-4 first:mt-2">
            <p
              className="px-4 pb-1 text-[10px] uppercase tracking-widest font-bold"
              style={{ color: '#8B82A8' }}
            >
              {group.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={isActive(pathname, item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Help */}
      <div className="pt-4" style={{ borderTop: '1px solid #E8E4DF' }}>
        <NavLink href="/help" icon={HelpCircle} label="Help Center" active={isActive(pathname, '/help')} />
      </div>
    </aside>
  )
}

function NavLink({ href, icon: Icon, label, active }: { href: string; icon: LucideIcon; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
        active
          ? 'bg-white text-[#6B5B95] shadow-[0_1px_3px_rgba(91,82,212,0.12)]'
          : 'text-[#8B82A8] hover:text-[#6B5B95] hover:bg-[#EDE9F8]'
      }`}
    >
      <Icon size={20} />
      {label}
    </Link>
  )
}
