
-- Add fixed salary fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fixed_salary numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS fixed_salary_active boolean NOT NULL DEFAULT false;

-- Make sale_id and payment_id nullable in invoice_lines (for fixed salary lines)
ALTER TABLE public.invoice_lines
  ALTER COLUMN sale_id DROP NOT NULL,
  ALTER COLUMN payment_id DROP NOT NULL;
