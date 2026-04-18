-- Table d'audit des webhooks externes en échec.
-- Permet de capturer le payload complet + erreur précise pour rejouer
-- depuis l'admin sans dépendre du provider (Calendly, etc.).

CREATE TABLE IF NOT EXISTS public.webhook_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL,
  headers jsonb,
  error_message text,
  error_stack text,
  status_code int,
  replayed_at timestamptz,
  replayed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  replay_status text CHECK (replay_status IN ('success', 'failed') OR replay_status IS NULL),
  replay_error text,
  resolved_at timestamptz,
  created_call_id uuid,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_webhook_failures_unresolved
  ON public.webhook_failures (received_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_failures_source_received
  ON public.webhook_failures (source, received_at DESC);

ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CEO manages webhook_failures" ON public.webhook_failures;
CREATE POLICY "CEO manages webhook_failures" ON public.webhook_failures
  FOR ALL
  USING (public.get_user_role() = 'ceo')
  WITH CHECK (public.get_user_role() = 'ceo');

COMMENT ON TABLE public.webhook_failures IS
  'Historique des webhooks externes en échec — permet de rejouer ou de diagnostiquer sans dépendre du provider.';
