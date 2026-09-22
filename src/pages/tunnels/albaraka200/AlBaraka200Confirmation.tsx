// TUNNEL « AL BARAKA 200 €/MOIS » — Page de confirmation de rendez-vous.
//
// Même rendu que celle des tunnels VSL et Liberty, d'où le composant partagé.
// Elle a sa propre ADRESSE parce que l'agenda est distinct : renvoyer ce
// tunnel vers /liberty/confirmation afficherait la bonne page au mauvais
// endroit, et rattacherait ses rendez-vous au tunnel Liberty.
//
// Aucun tunnel n'est déclaré : ce parcours n'a ni opt-in ni test A/B, il n'y a
// donc pas de conversion à mesurer. Les coordonnées affichées viennent
// entièrement des paramètres que Calendly ajoute à la redirection.
//
// À configurer côté Calendly (événement « Al Baraka 200 €/mois ») :
// Confirmation Page → Redirect to an external site →
// https://event.albarakaecosysteme.com/al-baraka-200/confirmation
// avec « pass event details to your redirect » activé.
import RendezVousConfirme from "../components/RendezVousConfirme";

export default function AlBaraka200Confirmation() {
  return <RendezVousConfirme />;
}
