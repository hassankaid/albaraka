-- ============================================================================
-- Système d'étiquettes leads (3 catégories : profil / budget / autre)
-- ============================================================================
-- Permet aux collaborateurs de qualifier un lead avec des tags prédéfinis
-- pour produire une synthèse marketing hebdomadaire des profils, budgets et
-- blocages observés sur le pipeline.
-- ============================================================================

CREATE TABLE public.lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_key text NOT NULL,
  tag_category text NOT NULL CHECK (tag_category IN ('profil', 'budget', 'autre')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (lead_id, tag_key)
);

CREATE INDEX idx_lead_tags_lead         ON public.lead_tags (lead_id);
CREATE INDEX idx_lead_tags_key_date     ON public.lead_tags (tag_key, created_at DESC);
CREATE INDEX idx_lead_tags_category     ON public.lead_tags (tag_category, created_at DESC);

ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;

-- RLS aligné sur lead_activities (gating canEdit fait côté frontend)
CREATE POLICY "Authenticated users can view lead tags"
  ON public.lead_tags
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert lead tags"
  ON public.lead_tags
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated users can delete lead tags"
  ON public.lead_tags
  FOR DELETE TO authenticated USING (true);
