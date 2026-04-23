// Types partagés du quiz lead magnet public.

export type ProfileKey = "batisseur" | "connecteur" | "createur";

export type Scores = Record<ProfileKey, number>;

export interface QuizOption {
  text: string;
  icon?: string;
  value?: string;
  detail?: string;
  scores?: Partial<Scores>;
}

export interface QuizQuestion {
  id: string;
  question: string;
  subtitle?: string | null;
  insight?: string | null;
  showIf?: { questionId: string; value: string };
  options: QuizOption[];
}

export interface QuizProfile {
  title: string;
  emoji: string;
  subtitle: string;
  color: string;
  gradient: string;
  description: string;
}

export interface QuizConfig {
  version: number;
  questions: {
    profile: QuizQuestion[];
    situation: QuizQuestion[];
    education: QuizQuestion[];
    rhetorical: QuizQuestion[];
  };
  profiles: Record<ProfileKey, QuizProfile>;
  orientation_question: QuizQuestion & { options: (QuizOption & { value: ProfileKey })[] };
  landing: {
    badge: string;
    title: string;
    description_prefix: string;
    description_highlight: string;
    bullets: string[];
    cta: string;
    trust_items: string[];
    powered_by_label: string;
    powered_by_brand: string;
    powered_by_description: string;
  };
  intro: {
    ready_title: string;
    description_line1: string;
    description_line2: string;
    steps: { icon: string; title: string; desc: string }[];
    footer: string;
    cta: string;
    form_title: string;
    form_description: string;
    form_cta: string;
    form_privacy: string;
  };
  conference: {
    phone_title: string;
    phone_description_prefix: string;
    phone_description_highlight: string;
    phone_reassurance: string;
    phone_cta: string;
    phone_privacy: string;
    conference_badge: string;
    conference_title_part1: string;
    conference_title_part2: string;
    conference_intro: string;
    conference_card_badge: string;
    conference_card_title: string;
    conference_bullets: { icon: string; text: string }[];
    eligibility_title: string;
    eligibility_bullets: string[];
    whatsapp_intro: string;
    whatsapp_message_preview_label: string;
    footer_tags: string;
    footer_dua: string;
  };
  whatsapp_message: string;
}

export interface QuizOwner {
  id: string;
  slug: string;
  display_name: string;
  display_role: string;
  whatsapp_phone: string;
}

export type QuizPhase =
  | "landing"
  | "form"
  | "intro"
  | "profile"
  | "situation"
  | "education"
  | "rhetorical"
  | "orientation"
  | "calculating"
  | "result"
  | "phone"
  | "conference";

export interface QuizAnswer {
  text: string;
  value?: string;
  icon?: string;
}

export type AnswersMap = Record<string, QuizAnswer>;
