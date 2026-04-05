import { ContentFormat, ContentTheme } from "./types";

export const THEMES: { id: ContentTheme; label: string; emoji: string }[] = [
  { id: "storytelling", label: "Storytelling", emoji: "📖" },
  { id: "douleurs", label: "Douleurs salarié", emoji: "😔" },
  { id: "educatif", label: "Islam & Commerce", emoji: "📚" },
  { id: "hijra", label: "Hijra & liberté", emoji: "🌍" },
  { id: "valeurs", label: "Valeurs & travail", emoji: "💜" },
  { id: "motivation", label: "Motivation", emoji: "🔥" },
  { id: "temoignage", label: "Témoignage", emoji: "🙋" },
  { id: "argent", label: "Argent & Islam", emoji: "💰" },
  { id: "famille", label: "Famille & ambition", emoji: "👨‍👩‍👧" },
  { id: "mythes", label: "Mythes business", emoji: "💥" },
];

export const FORMATS: { id: ContentFormat; label: string; description: string; emoji: string }[] = [
  { id: "voixoff", label: "Voix off", description: "Narration sur B-rolls", emoji: "🎙️" },
  { id: "brolls", label: "B-rolls", description: "Images de coupe sans voix", emoji: "🎬" },
  { id: "facecam", label: "Facecam", description: "Face caméra avec narration", emoji: "🎥" },
];

export const STEPS = [
  { id: 1, label: "Idée", emoji: "💡" },
  { id: 2, label: "Script", emoji: "✍️" },
  { id: 3, label: "Montage", emoji: "📱" },
  { id: 4, label: "Description", emoji: "📄" },
  { id: 5, label: "Publication", emoji: "🚀" },
] as const;

export const THEMES_LABELS_FR: Record<ContentTheme, string> = {
  storytelling: "storytelling musulmans francophones",
  douleurs: "douleurs du salarié musulman en France",
  educatif: "Islam et commerce halal",
  hijra: "hijra et liberté digitale",
  valeurs: "valeurs du travail halal",
  motivation: "motivation entrepreneur musulman",
  temoignage: "témoignage de transformation digitale",
  argent: "argent et Islam halal",
  famille: "famille et ambition digitale",
  mythes: "mythes du business en ligne",
};

export const FORMATS_LABELS_FR: Record<ContentFormat, string> = {
  voixoff: "vidéo voix off (narration sur B-rolls)",
  brolls: "vidéo B-rolls uniquement (sans voix)",
  facecam: "vidéo face caméra",
};
