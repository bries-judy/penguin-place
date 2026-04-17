-- ═══════════════════════════════════════════════════════════════
-- PENGUIN PLACE — Migratie 042: view v_ouder_saldo (Fase 2b.1)
-- ═══════════════════════════════════════════════════════════════
--
-- Aggregeert openstaand saldo per ouder via de bridge:
--   ouder_profielen.id → ouder_kind.ouder_id
--   ouder_kind.contactpersoon_id → invoices.parent_id
--   invoices.status IN ('sent', 'overdue') → openstaand
--
-- Eén rij per ouder (ook bij 0 openstaande facturen). LEFT JOINs
-- zorgen dat ouders zonder kind of zonder factuur alsnog zichtbaar zijn.
--
-- RLS: views gebruiken de security-context van de aanroeper. De onder-
-- liggende tabellen (invoices, ouder_kind, ouder_profielen) hebben elk
-- hun eigen RLS-policies; de view erft dat automatisch.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_ouder_saldo AS
SELECT
  o.id                                                    AS ouder_id,
  o.organisatie_id                                        AS organisatie_id,
  COALESCE(SUM(
    CASE WHEN i.status IN ('sent', 'overdue')
         THEN i.totaal_bedrag ELSE 0 END
  ), 0)::DECIMAL(12,2)                                    AS openstaand_bedrag,
  COUNT(*) FILTER (WHERE i.status IN ('sent', 'overdue')) AS aantal_openstaand,
  MIN(i.created_at) FILTER (
    WHERE i.status IN ('sent', 'overdue')
  )                                                       AS oudste_openstaande_datum,
  MAX(i.created_at) FILTER (WHERE i.status = 'paid')      AS laatste_betaling_op
FROM public.ouder_profielen o
LEFT JOIN public.ouder_kind ok  ON ok.ouder_id = o.id AND ok.actief = true
LEFT JOIN public.invoices   i   ON i.parent_id = ok.contactpersoon_id
GROUP BY o.id, o.organisatie_id;

COMMENT ON VIEW public.v_ouder_saldo IS
  'Openstaand saldo per ouder. Sent + overdue facturen via '
  'ouder_kind.contactpersoon_id → invoices.parent_id. Fase 2b.1.';
