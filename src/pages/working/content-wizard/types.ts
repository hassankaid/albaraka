export type ContentFormat = "voixoff" | "brolls" | "facecam";

export type ContentTheme =
  | "storytelling"
  | "douleurs"
  | "educatif"
  | "hijra"
  | "valeurs"
  | "motivation"
  | "temoignage"
  | "argent"
  | "famille"
  | "mythes";

export interface ContentIdea {
  titre: string;
  accroche: string;
}

export interface ContentScript {
  hook: string;
  keywords_pexels_1: string[];
  valeur: string;
  keywords_pexels_2: string[];
  cta: string;
  keywords_pexels_3: string[];
  full_text: string;
}

export interface ContentDescription {
  accroche: string;
  valeur: string;
  cta: string;
  hashtags: string[];
  full_text: string;
}

export interface PublicationChecklist {
  instagram: boolean;
  tiktok: boolean;
  youtube_shorts: boolean;
  facebook: boolean;
}

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export type ContentPieceStatusType = "en_cours" | "pret" | "publie";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface ContentWizardState {
  contentPieceId: string | null;
  title: string | null;
  status: ContentPieceStatusType;
  scheduledFor: string | null;
  format: ContentFormat;
  theme: ContentTheme;
  ideas: ContentIdea[];
  selectedIdea: ContentIdea | null;
  script: ContentScript | null;
  description: ContentDescription | null;
  publicationChecklist: PublicationChecklist;
  currentStep: WizardStep;
  stepsToRegenerate: number[];
  saveState: SaveState;
  lastSavedAt: string | null;
}
