import { createContext, useContext, useReducer, ReactNode } from "react";
import {
  ContentWizardState,
  ContentFormat,
  ContentTheme,
  ContentIdea,
  ContentScript,
  ContentDescription,
  MontageChecklist,
  PublicationChecklist,
  WizardStep,
} from "./types";

const initialState: ContentWizardState = {
  format: "voixoff",
  theme: "storytelling",
  ideas: [],
  selectedIdea: null,
  script: null,
  montageChecklist: {
    pexels_downloaded: false,
    edited_in_capcut: false,
    voiceover_recorded: false,
    subtitles_added: false,
  },
  description: null,
  publicationChecklist: {
    instagram: false,
    tiktok: false,
    youtube_shorts: false,
    facebook: false,
  },
  currentStep: 1,
  stepsToRegenerate: [],
};

type Action =
  | { type: "SET_FORMAT"; payload: ContentFormat }
  | { type: "SET_THEME"; payload: ContentTheme }
  | { type: "SET_IDEAS"; payload: ContentIdea[] }
  | { type: "SELECT_IDEA"; payload: ContentIdea }
  | { type: "SET_SCRIPT"; payload: ContentScript }
  | { type: "TOGGLE_MONTAGE"; payload: keyof MontageChecklist }
  | { type: "SET_DESCRIPTION"; payload: ContentDescription }
  | { type: "TOGGLE_PUBLICATION"; payload: keyof PublicationChecklist }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "RESET" };

function reducer(state: ContentWizardState, action: Action): ContentWizardState {
  switch (action.type) {
    case "SET_FORMAT":
      return {
        ...state,
        format: action.payload,
        stepsToRegenerate:
          state.script || state.description
            ? Array.from(new Set([...state.stepsToRegenerate, 2, 4]))
            : state.stepsToRegenerate,
      };
    case "SET_THEME":
      return { ...state, theme: action.payload };
    case "SET_IDEAS":
      return { ...state, ideas: action.payload };
    case "SELECT_IDEA":
      return {
        ...state,
        selectedIdea: action.payload,
        stepsToRegenerate:
          state.script || state.description
            ? Array.from(new Set([...state.stepsToRegenerate, 2, 4]))
            : state.stepsToRegenerate,
      };
    case "SET_SCRIPT":
      return {
        ...state,
        script: action.payload,
        stepsToRegenerate: state.stepsToRegenerate.filter((s) => s !== 2),
      };
    case "TOGGLE_MONTAGE":
      return {
        ...state,
        montageChecklist: {
          ...state.montageChecklist,
          [action.payload]: !state.montageChecklist[action.payload],
        },
      };
    case "SET_DESCRIPTION":
      return {
        ...state,
        description: action.payload,
        stepsToRegenerate: state.stepsToRegenerate.filter((s) => s !== 4),
      };
    case "TOGGLE_PUBLICATION":
      return {
        ...state,
        publicationChecklist: {
          ...state.publicationChecklist,
          [action.payload]: !state.publicationChecklist[action.payload],
        },
      };
    case "GO_TO_STEP":
      return { ...state, currentStep: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const ContentWizardContext = createContext<{
  state: ContentWizardState;
  setFormat: (f: ContentFormat) => void;
  setTheme: (t: ContentTheme) => void;
  setIdeas: (i: ContentIdea[]) => void;
  selectIdea: (i: ContentIdea) => void;
  setScript: (s: ContentScript) => void;
  toggleMontageItem: (k: keyof MontageChecklist) => void;
  setDescription: (d: ContentDescription) => void;
  togglePublicationPlatform: (k: keyof PublicationChecklist) => void;
  goToStep: (s: WizardStep) => void;
  reset: () => void;
} | null>(null);

export function ContentWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = {
    state,
    setFormat: (f: ContentFormat) => dispatch({ type: "SET_FORMAT", payload: f }),
    setTheme: (t: ContentTheme) => dispatch({ type: "SET_THEME", payload: t }),
    setIdeas: (i: ContentIdea[]) => dispatch({ type: "SET_IDEAS", payload: i }),
    selectIdea: (i: ContentIdea) => dispatch({ type: "SELECT_IDEA", payload: i }),
    setScript: (s: ContentScript) => dispatch({ type: "SET_SCRIPT", payload: s }),
    toggleMontageItem: (k: keyof MontageChecklist) =>
      dispatch({ type: "TOGGLE_MONTAGE", payload: k }),
    setDescription: (d: ContentDescription) =>
      dispatch({ type: "SET_DESCRIPTION", payload: d }),
    togglePublicationPlatform: (k: keyof PublicationChecklist) =>
      dispatch({ type: "TOGGLE_PUBLICATION", payload: k }),
    goToStep: (s: WizardStep) => dispatch({ type: "GO_TO_STEP", payload: s }),
    reset: () => dispatch({ type: "RESET" }),
  };

  return (
    <ContentWizardContext.Provider value={value}>
      {children}
    </ContentWizardContext.Provider>
  );
}

export function useContentWizard() {
  const context = useContext(ContentWizardContext);
  if (!context) {
    throw new Error("useContentWizard must be used within ContentWizardProvider");
  }
  return context;
}
