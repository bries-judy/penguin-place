'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function NavLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  const pathname = usePathname()
  const active = isActive(pathname, href)

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
