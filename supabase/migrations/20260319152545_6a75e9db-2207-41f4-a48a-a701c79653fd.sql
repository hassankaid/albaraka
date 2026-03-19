
CREATE TABLE public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  campaign_name text NOT NULL,
  campaign_id text NOT NULL,
  channel text,
  amount_spent numeric NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_select_ceo" ON public.ads FOR SELECT TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "ads_insert_all" ON public.ads FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "ads_update_ceo" ON public.ads FOR UPDATE TO authenticated
  USING (get_user_role() = 'ceo');

CREATE POLICY "ads_delete_ceo" ON public.ads FOR DELETE TO authenticated
  USING (get_user_role() = 'ceo');

-- Updated_at trigger
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Unique constraint: one row per campaign per day
ALTER TABLE public.ads ADD CONSTRAINT ads_date_campaign_unique UNIQUE (date, campaign_id);
