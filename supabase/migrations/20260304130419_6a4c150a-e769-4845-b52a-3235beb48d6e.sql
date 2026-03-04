
-- 1. AKIF TASER: link call_id
UPDATE public.sales 
SET call_id = '0495d1c9-a562-4443-a762-3e9f1800cc1b'
WHERE id = '07586027-99ea-42eb-b654-44eb9c86f002' AND call_id IS NULL;

-- 2. ZAKARIYA HEBBAR: link lead_id and fix contact to the lead's contact
UPDATE public.sales 
SET lead_id = '593670fc-f34b-41d4-b0aa-c3fff00533f0'
WHERE id = '97568bc1-adce-4c7b-90db-99e5f4dc3f95' AND lead_id IS NULL;

-- 3. NEYLLA MEDINI: link lead_id (same contact, no duplicate)
UPDATE public.sales 
SET lead_id = '94f858d4-7ca7-4b46-beb2-ee536964084a'
WHERE id = '2a00a240-a2ff-4e02-a64d-7c615590c0ef' AND lead_id IS NULL;
