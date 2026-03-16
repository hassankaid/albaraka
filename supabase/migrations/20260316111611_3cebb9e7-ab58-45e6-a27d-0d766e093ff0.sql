
-- Add collaborateur level (intermediaire = CEO assigns leads, confirme = can self-assign)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS collaborateur_level text DEFAULT NULL;

-- Add is_active flag for disabling members
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Set existing collaborateurs as confirme (preserve current behavior)
UPDATE public.profiles 
SET collaborateur_level = 'confirme' 
WHERE role = 'collaborateur' AND collaborateur_level IS NULL;
