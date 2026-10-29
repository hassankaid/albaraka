-- Studio : la version gratuite retrouve les mêmes durées que l'abonnement (Sidali, 29/10/2026
-- au soir). Depuis le 13/10, seules 4 vidéos d'élèves sur 94 dépassaient 2 min 30 de brut, pour
-- ~5 centimes d'IA de plus chacune ; ce qui coûte, c'est le motion design complet (Hyperframes),
-- qui reste réservé à l'abonnement. La version gratuite garde donc 1 vidéo par jour et le
-- motion design léger ; 5 min en face caméra et 3 min en voix off pour tous.
-- Vider la valeur (json null) suffit : studio_quota renvoie alors duree_max_s = null, et le
-- front comme la machine appliquent les durées habituelles. Remettre un nombre de secondes
-- rétablit une limite propre à la version gratuite.
update public.studio_config set valeur = 'null'::jsonb where cle = 'duree_max_gratuit';
