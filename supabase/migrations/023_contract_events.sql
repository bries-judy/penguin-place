-- 023_contract_events.sql
-- Audit log voor contract-events (activering, beëindiging, wijziging).
-- Wordt gebruikt voor facturatie-integratie en audit trail.

CREATE TABLE IF NOT EXISTS contract_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisatie_id  UUID NOT NULL REFERENCES organisaties(id),
  contract_id     UUID NOT NULL REFERENCES contracten(id),
  event_type      TEXT NOT NULL,  -- 'geactiveerd', 'beeindigd', 'gewijzigd'
  payload         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_contract_events_contract_id ON contract_events(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_events_organisatie_id ON contract_events(organisatie_id);

-- RLS
ALTER TABLE contract_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_events_org_isolation" ON contract_events
  FOR ALL
  USING (organisatie_id = get_organisatie_id());

COMMENT ON TABLE contract_events IS 'Audit log voor contract lifecycle events — basis voor facturatie-integratie';
