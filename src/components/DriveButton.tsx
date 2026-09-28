import { FolderOpen } from "lucide-react";
import { DRIVE_URL } from "@/config/drive";

/**
 * Bouton « Drive Al Baraka » du header.
 *
 * Placé juste après DiscordButton dans DashboardLayout et ApporteurLayout —
 * le header est la seule zone réellement permanente de la plateforme
 * (sticky), alors que la barre latérale défile sur une trentaine d'entrées.
 *
 * Couleur : l'or AL BARAKA (#D4AF37), complémentaire de l'indigo Discord.
 * Deux boutons de marque côte à côte auraient été illisibles ; deux couleurs
 * opposées se distinguent au premier coup d'œil. Le texte est presque noir,
 * parce que du blanc sur cet or tombe à 2:1 de contraste — illisible. Là on
 * est à ~9:1.
 *
 * Le lien pointe vers OneDrive, pas Google Drive : on n'emprunte donc aucune
 * identité tierce, on utilise la nôtre.
 *
 * Responsive : icône + libellé à partir de sm, icône seule sur mobile, comme
 * Discord. Au-delà de trois raccourcis, il faudra basculer sur un unique
 * bouton « Ressources » avec menu déroulant — le header ne tiendra pas.
 */
export function DriveButton() {
  return (
    <a
      href={DRIVE_URL}
      target="_blank"
      rel="noopener noreferrer"
      title="Accéder au Drive Al Baraka"
      aria-label="Accéder au Drive Al Baraka"
      className="flex items-center gap-1.5 rounded-lg bg-gold-400 px-2.5 py-1.5 text-xs font-semibold text-[#1A1407] shadow-sm transition-colors hover:bg-gold-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50"
    >
      <FolderOpen className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Drive</span>
    </a>
  );
}
