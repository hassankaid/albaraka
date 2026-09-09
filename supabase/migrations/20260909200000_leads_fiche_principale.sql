-- ═══════════════════════════════════════════════════════════════════════
-- Relier les fiches d'une meme personne, sans jamais en supprimer aucune.
--
-- POURQUOI LIER PLUTOT QUE FUSIONNER. Dans ce schema, chaque fiche EST un
-- evenement de la timeline : il n'existe pas de journal d'inscriptions a cote.
-- Supprimer les fiches en trop detruirait 2 375 lignes d'historique
-- (`lead_activities` est en ON DELETE CASCADE) et detacherait 56 appels et
-- 15 ventes — c'est-a-dire exactement la timeline qu'on veut construire.
-- Un lien se defait par un UPDATE ; une suppression ne se defait par rien.
--
-- CE QUI EST RATTACHE ICI, ET RIEN D'AUTRE. 62 groupes sur 288, soit 64 fiches,
-- ceux ou il n'y a AUCUN arbitrage a rendre : une seule source, au plus un
-- commercial, au plus un apporteur, au plus une fiche engageante, aucune vente,
-- au plus un appel. Verifie : zero motif de reengagement parmi eux (une fiche
-- ecartee suivie d'une fiche ouverte), quelle que soit l'anciennete.
-- Les 226 groupes restants demandent une decision humaine — apporteurs ou
-- commerciaux divergents, ventes multiples — et ne sont pas touches.
--
-- LA PRINCIPALE EST LA PLUS RECENTE, PAS LA PLUS AVANCEE. Premier essai avec
-- le statut le plus engageant : il faisait remonter des etats perimes. Trois
-- personnes ressortaient en `call_booke` alors qu'elles avaient ete ecartees
-- trois mois plus tard, et le classement ignorait `a_relancer`. Sur les 8 cas
-- ou les deux regles divergent, la plus recente est la bonne dans les 8 : c'est
-- elle qui dit l'etat actuel de la relation, et c'est sur elle qu'on agit.
--
-- AUCUN TRAVAIL N'EST PERDU. Sur les 64 fiches rattachees, 5 sont encore
-- actives ; dans les 5 cas la fiche principale appartient au MEME commercial,
-- et 4 fois sur 5 elle est active elle aussi. Chaque personne reste dans la
-- meme file, une fois au lieu de deux.
--
-- CETTE COLONNE NE CHANGE RIEN AUJOURD'HUI : aucune requete ne la lit encore.
-- Elle prepare l'affichage « une ligne par personne », qui reste soumis a la
-- validation de l'equipe commerciale.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.leads
  add column if not exists fiche_principale_id uuid references public.leads(id) on delete set null;

comment on column public.leads.fiche_principale_id is
  'Fiche principale du meme contact, quand plusieurs fiches decrivent la meme personne. NULL = fiche autonome ou principale. Ne supprime rien : la fiche rattachee garde son historique, ses appels et son attribution.';

create index if not exists leads_fiche_principale_idx
  on public.leads (fiche_principale_id) where fiche_principale_id is not null;

alter table public.leads drop constraint if exists leads_fiche_principale_coherente;
alter table public.leads
  add constraint leads_fiche_principale_coherente
  check (fiche_principale_id is null or fiche_principale_id <> id);
