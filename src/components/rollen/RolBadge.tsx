interface RolBadgeProps {
  naam: string
  kleur?: string
  size?: 'sm' | 'md'
}

export function RolBadge({ naam, kleur = '#6366F1', size = 'md' }: RolBadgeProps) {
  const hex = kleur.replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1'

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold capitalize ${sizeClass}`}
      style={{
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        color: kleur,
      }}
    >
      {naam}
    </span>
  )
}
