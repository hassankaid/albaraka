
-- Link the sale to the correct lead and contact
UPDATE public.sales 
SET lead_id = '597f0c15-6bd8-4d70-9df7-4f90cd6faf9d',
    contact_id = '06623c94-efc1-4756-b401-dc176533e563'
WHERE id = '07586027-99ea-42eb-b654-44eb9c86f002';

-- Update original contact name to full name
UPDATE public.contacts 
SET full_name = 'AKIF TASER'
WHERE id = '06623c94-efc1-4756-b401-dc176533e563';
