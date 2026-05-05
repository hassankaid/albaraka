export const ZOOM_COACHING = {
  url: "https://us06web.zoom.us/j/89923943870?pwd=HxLIlAoPMLKnLWj8KzyNI2lVB39VNW.1",
  meetingId: "899 2394 3870",
  passcode: "985409",
};

export type DayName =
  | "Lundi"
  | "Mardi"
  | "Mercredi"
  | "Jeudi"
  | "Vendredi"
  | "Samedi"
  | "Dimanche";

export interface CoachingSlot {
  id: string;
  day: DayName;
  hour: number;
  minute: number;
  durationMinutes: number;
  title: string;
  coach: string;
  emoji?: string;
}

export const COACHING_SLOTS: CoachingSlot[] = [
  {
    id: "setting-telephonique",
    day: "Lundi",
    hour: 20,
    minute: 30,
    durationMinutes: 90,
    title: "Setting Téléphonique",
    coach: "Sabrina",
    emoji: "📞",
  },
  {
    id: "creation-contenus",
    day: "Vendredi",
    hour: 19,
    minute: 0,
    durationMinutes: 90,
    title: "Créa de contenus",
    coach: "Miradie",
    emoji: "🎬",
  },
  {
    id: "setting-message",
    day: "Samedi",
    hour: 10,
    minute: 0,
    durationMinutes: 90,
    title: "Setting Message",
    coach: "Saba",
    emoji: "💬",
  },
  {
    id: "closing",
    day: "Dimanche",
    hour: 9,
    minute: 0,
    durationMinutes: 90,
    title: "Closing",
    coach: "Hedi",
    emoji: "🎯",
  },
];
