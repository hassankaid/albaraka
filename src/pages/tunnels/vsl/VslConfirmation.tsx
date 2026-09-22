// TUNNEL VSL — Page de confirmation de prise de rendez-vous.
//
// Atteinte après réservation sur le Calendly de /vsl/merci, via la redirection
// Calendly vers https://event.albarakaecosysteme.com/vsl/confirmation.
//
// Le rendu est partagé avec le tunnel Liberty : voir RendezVousConfirme.
import RendezVousConfirme from "../components/RendezVousConfirme";
import { VSL_TUNNEL } from "../config";

export default function VslConfirmation() {
  return <RendezVousConfirme tunnel={VSL_TUNNEL} />;
}
