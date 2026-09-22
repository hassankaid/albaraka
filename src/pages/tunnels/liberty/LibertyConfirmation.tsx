// TUNNEL LIBERTY — Page de confirmation de prise de rendez-vous (page 3/3).
//
// « Même style que la typ rdv webinaire », demandé par l'équipe marketing :
// c'est littéralement la même page que celle du tunnel VSL, d'où le composant
// partagé. Seul le tunnel déclaré change, pour que la conversion soit
// rattachée au bon test.
//
// Atteinte après réservation sur le Calendly de /liberty/merci, via la
// redirection Calendly vers
// https://event.albarakaecosysteme.com/liberty/confirmation
// (« pass event details to your redirect » activé).
import RendezVousConfirme from "../components/RendezVousConfirme";
import { LIBERTY_TUNNEL } from "../config";

export default function LibertyConfirmation() {
  return <RendezVousConfirme tunnel={LIBERTY_TUNNEL} />;
}
