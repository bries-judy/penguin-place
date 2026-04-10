import type { Groep, GroepBezetting } from './supabase/types'

const DAGEN = ['Ma', 'Di', 'Wo', 'Do', 'Vr']

export { DAGEN }

// Bereken bezettingsstatus op basis van percentage
export function bezettingStatus(percentage: number): 'groen' | 'oranje' | 'rood' {
  if (percentage >= 100) return 'rood'
  if (percentage >= 80) return 'oranje'
  return 'groen'
}

// Kleur class op basis van status
export function statusKleur(status: 'groen' | 'oranje' | 'rood') {
  switch (status) {
    case 'groen': return 'bg-green-100 text-green-800 border-green-200'
    case 'oranje': return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'rood': return 'bg-red-100 text-red-800 border-red-200'
  }
}

export function statusDot(status: 'groen' | 'oranje' | 'rood') {
  switch (status) {
    case 'groen': return 'bg-green-500'
    case 'oranje': return 'bg-orange-400'
    case 'rood': return 'bg-red-500'
  }
}

// BKR ratio per leeftijdscategorie
export function bkrRatio(leeftijdscategorie: Groep['leeftijdscategorie']): number {
  switch (leeftijdscategorie) {
    case 'baby': return 3
    case 'dreumes': return 5
    case 'peuter': return 8
    case 'bso': return 10
  }
}

export function benoddigdeBeroepskrachten(aanwezig: number, leeftijdscategorie: Groep['leeftijdscategorie']): number {
  return Math.ceil(aanwezig / bkrRatio(leeftijdscategorie))
}

// Label voor leeftijdscategorie
export function categorieLabel(cat: Groep['leeftijdscategorie']): string {
  switch (cat) {
    case 'baby': return 'Baby (0-12m)'
    case 'dreumes': return 'Dreumes (12-24m)'
    case 'peuter': return 'Peuter (24-48m)'
    case 'bso': return 'BSO (4-12j)'
  }
}

// Haal week-datums op (ma t/m vr) voor een gegeven referentiedatum
export function getWeekDagen(referentie: Date): Date[] {
  const dag = referentie.getDay()
  const ma = new Date(referentie)
  const diff = dag === 0 ? -6 : 1 - dag  // zondag = 0
  ma.setDate(referentie.getDate() + diff)

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(ma)
    d.setDate(ma.getDate() + i)
    return d
  })
}

export function formatDatum(date: Date): string {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
}

export function formatWeekLabel(maandag: Date): string {
  const vrijdag = new Date(maandag)
  vrijdag.setDate(maandag.getDate() + 4)
  return `${formatDatum(maandag)} – ${formatDatum(vrijdag)} ${vrijdag.getFullYear()}`
}
