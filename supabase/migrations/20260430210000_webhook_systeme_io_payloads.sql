-- Archive des payloads Systeme.io reçus par le webhook.
--
-- Objectif : conserver les 1000 derniers payloads bruts pour pouvoir
-- analyser le format réel d'un webhook (notamment l'emplacement des UTM,
-- de l'URL source, etc.) sans avoir à modifier la edge function pour
-- chaque investigation.
--
-- Garde une fenêtre roulante : un trigger purge automatiquement au-delà
-- de 1000 lignes pour éviter la croissance indéfinie.

CREATE TABLE IF NOT EXISTS webhook_systeme_io_payloads (
  id           bigserial PRIMARY KEY,
  received_at  timestamptz NOT NULL DEFAULT now(),
  source       text,                -- vsl_a / vsl_b / vsl_webi
  systeme_io_id text,
  contact_id   uuid,
  lead_id      uuid,
  utm_source   text,                -- extrait pendant le webhook (debug visuel)
  utm_medium   text,
  utm_campaign text,
  utm_content  text,
  utm_term     text,
  source_url   text,                -- URL trouvée dans le payload (si trouvée)
  payload      jsonb NOT NULL,
  parse_notes  text                 -- chemin où l'URL a été trouvée, ou raison de l'échec
);

CREATE INDEX IF NOT EXISTS idx_webhook_sio_received_at
  ON webhook_systeme_io_payloads(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_sio_systeme_io_id
  ON webhook_systeme_io_payloads(systeme_io_id);

-- Trigger de purge : garde uniquement les 1000 dernières lignes
CREATE OR REPLACE FUNCTION purge_old_webhook_payloads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM webhook_systeme_io_payloads
  WHERE id IN (
    SELECT id FROM webhook_systeme_io_payloads
    ORDER BY id DESC
    OFFSET 1000
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_webhook_payloads ON webhook_systeme_io_payloads;

CREATE TRIGGER trg_purge_webhook_payloads
AFTER INSERT ON webhook_systeme_io_payloads
FOR EACH STATEMENT
EXECUTE FUNCTION purge_old_webhook_payloads();

-- RLS : lecture pour CEO uniquement
ALTER TABLE webhook_systeme_io_payloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ceo_read_webhook_payloads" ON webhook_systeme_io_payloads;

CREATE POLICY "ceo_read_webhook_payloads"
ON webhook_systeme_io_payloads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ceo'
  )
);
