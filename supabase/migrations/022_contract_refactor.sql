-- 022_contract_refactor.sql
-- Contracten tabel uitbreiden met contract_type_id, dagdelen, en gesplitste maandprijzen.
-- Bestaande kolommen (contracttype, uurtarief, maandprijs) worden behouden voor backward compatibility.

-- ─────────────────────────────────────────────────────
-- 1. Contract status enum uitbreiden
-- ─────────────────────────────────────────────────────
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'te_beeindigen';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'geannuleerd';
ALTER TYPE contract_status ADD VALUE IF NOT EXISTS 'facturatie_fout';

-- ─────────────────────────────────────────────────────
-- 2. Contracten tabel uitbreiden
-- ─────────────────────────────────────────────────────
ALTER TABLE contracten
  ADD COLUMN IF NOT EXISTS contract_type_id UUID REFERENCES contracttypen(id),
  ADD COLUMN IF NOT EXISTS dagdelen JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS maandprijs_bruto DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS maandprijs_netto DECIMAL(8,2);

-- Indices voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_contracten_contract_type_id ON contracten(contract_type_id);

-- Comment: na migratie worden uurtarief/maandprijs velden deprecated — nieuwe contracten
-- vullen contract_type_id, dagdelen, maandprijs_bruto en maandprijs_netto.
COMMENT ON COLUMN contracten.contract_type_id IS 'FK naar contracttypen — vervangt het text enum contracttype veld';
COMMENT ON COLUMN contracten.dagdelen IS 'JSON: weekdag → dagdeel, bijv. {"0": "hele_dag", "2": "ochtend", "4": "middag"}';
COMMENT ON COLUMN contracten.maandprijs_bruto IS 'Berekend: SOM(uren_per_dag × uurtarief) × 52/12, vóór kortingen';
COMMENT ON COLUMN contracten.maandprijs_netto IS 'Berekend: maandprijs_bruto minus toegepaste kortingen';
