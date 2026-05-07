-- Ajoute le statut "renvoi_pole_vente" à la liste autorisée pour leads.status.
-- Représente un lead qualifié transmis au Pôle Vente pour finalisation.

ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status = ANY (ARRAY[
    'a_qualifier'::text,
    'faux_numero'::text,
    'pas_de_reponse'::text,
    'pas_de_reponse_post_conference'::text,
    'pas_qualifie'::text,
    'a_relancer'::text,
    'perdu'::text,
    'inscrit_conference'::text,
    'call_booke'::text,
    'renvoi_pole_vente'::text,
    'close'::text
  ]));
