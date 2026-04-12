import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Controleert of een locatie open is op een gegeven datum en tijdstip.
 * Gebruikt door de planningsmodule bij het valideren van plaatsingen.
 *
 * Logica:
 * 1. Check uitzonderingen voor datum (overlappende start/eind_datum)
 * 2. Uitzondering is_gesloten = true → return false
 * 3. Uitzondering met aangepaste tijden → check die tijden
 * 4. Anders: reguliere openingstijden voor dag van de week
 * 5. Check of tijd binnen open_tijd–sluit_tijd valt
 */
export async function isLocatieOpen(
  supabase: SupabaseClient,
  locatieId: string,
  datum: Date,
  tijd: string  // "HH:MM"
): Promise<boolean> {
  const datumStr = datum.toISOString().split('T')[0]  // "YYYY-MM-DD"

  // Stap 1: check uitzonderingen voor deze datum
  const { data: uitzonderingen } = await supabase
    .from('locatie_openingstijden_uitzonderingen')
    .select('is_gesloten, open_tijd, sluit_tijd')
    .eq('locatie_id', locatieId)
    .lte('start_datum', datumStr)
    .gte('eind_datum', datumStr)
    .limit(1)

  if (uitzonderingen && uitzonderingen.length > 0) {
    const u = uitzonderingen[0]

    // Stap 2: uitzondering is gesloten
    if (u.is_gesloten) return false

    // Stap 3: uitzondering met aangepaste tijden
    if (u.open_tijd && u.sluit_tijd) {
      return tijd >= u.open_tijd && tijd < u.sluit_tijd
    }

    // Uitzondering zonder tijden maar niet gesloten: beschouw als open
    return true
  }

  // Stap 4: reguliere openingstijden voor dag van de week
  const dagNamen = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za']
  const dagVanDeWeek = dagNamen[datum.getDay()]

  const { data: openingstijden } = await supabase
    .from('locatie_openingstijden')
    .select('is_open, open_tijd, sluit_tijd')
    .eq('locatie_id', locatieId)
    .eq('dag_van_week', dagVanDeWeek)
    .single()

  // Stap 5: dag niet gevonden of gesloten
  if (!openingstijden || !openingstijden.is_open) return false

  if (openingstijden.open_tijd && openingstijden.sluit_tijd) {
    return tijd >= openingstijden.open_tijd && tijd < openingstijden.sluit_tijd
  }

  // is_open = true maar geen tijden opgegeven: beschouw als open
  return true
}
