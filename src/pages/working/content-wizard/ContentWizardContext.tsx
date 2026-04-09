import { createContext, useContext, useReducer, ReactNode } from "react";
import {
  ContentWizardState,
  ContentFormat,
  ContentTheme,
  ContentIdea,
  ContentScript,
  ContentDescription,
  PublicationChecklist,
  WizardStep,
  SaveState,
} from "./types";
import { computeStatus } from "./lib/computeStatus";
import type { ContentPiece } from "@/hooks/useContentPiece";

const initialState: ContentWizardState = {
  contentPieceId: null,
  title: null,
  status: "en_cours",
  scheduledFor: null,
  format: "voixoff",
  theme: "storytelling",
  ideas: [],
  selectedIdea: null,
  script: null,
  description: null,
  publicationChecklist: {
    instagram: false,
    tiktok: false,
    youtube_shorts: false,
    facebook: false,
  },
  currentStep: 1,
  stepsToRegenerate: [],
  saveState: "idle",
  lastSavedAt: null,
};

type Action =
  | { type: "SET_FORMAT"; payload: ContentFormat }
  | { type: "SET_THEME"; payload: ContentTheme }
  | { type: "SET_IDEAS"; payload: ContentIdea[] }
  | { type: "SELECT_IDEA"; payload: ContentIdea }
  | { type: "SET_SCRIPT"; payload: ContentScript }
  | { type: "SET_DESCRIPTION"; payload: ContentDescription }
  | { type: "TOGGLE_PUBLICATION"; payload: keyof PublicationChecklist }
  | { type: "GO_TO_STEP"; payload: WizardStep }
  | { type: "SET_SCHEDULED_FOR"; payload: string | null }
  | { type: "SET_TITLE"; payload: string | null }
  | { type: "SET_CONTENT_PIECE_ID"; payload: string }
  | { type: "SET_SAVE_STATE"; payload: { state: SaveState; lastSavedAt?: string } }
  | { type: "LOAD_FROM_CONTENT_PIECE"; payload: ContentPiece }
  | { type: "RESET" };

function rawReducer(state: ContentWizardState, action: Action): ContentWizardState {
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
        title: action.payload.titre,
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
    case "SET_SCHEDULED_FOR":
      return { ...state, scheduledFor: action.payload };
    case "SET_TITLE":
      return { ...state, title: action.payload };
    case "SET_CONTENT_PIECE_ID":
      return { ...state, contentPieceId: action.payload };
    case "SET_SAVE_STATE":
      return {
        ...state,
        saveState: action.payload.state,
        lastSavedAt: action.payload.lastSavedAt ?? state.lastSavedAt,
      };
    case "LOAD_FROM_CONTENT_PIECE": {
      const cp = action.payload;
      const loadedState: ContentWizardState = {
        contentPieceId: cp.id,
        title: cp.title,
        status: cp.status,
        scheduledFor: cp.scheduled_for,
        format: cp.format,
        theme: cp.theme,
        ideas: cp.ideas || [],
        selectedIdea: cp.selected_idea,
        script: cp.script,
        description: cp.description,
        publicationChecklist: cp.publication_checklist || initialState.publicationChecklist,
        currentStep: Math.max(1, Math.min(5, cp.current_step || 1)) as WizardStep,
        stepsToRegenerate: [],
        saveState: "saved",
        lastSavedAt: cp.updated_at,
      };
      return {
        ...loadedState,
        status: computeStatus(loadedState),
      };
    }
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function reducer(state: ContentWizardState, action: Action): ContentWizardState {
  const noRecomputeActions: Action["type"][] = [
    "GO_TO_STEP",
    "SET_CONTENT_PIECE_ID",
    "SET_SAVE_STATE",
    "SET_TITLE",
  ];

  const newState = rawReducer(state, action);

  if (action.type === "LOAD_FROM_CONTENT_PIECE" || action.type === "RESET") {
    return newState;
  }

  if (noRecomputeActions.includes(action.type)) {
    return newState;
  }

  return {
    ...newState,
    status: computeStatus(newState),
  };
}

const ContentWizardContext = createContext<{
  state: ContentWizardState;
  setFormat: (f: ContentFormat) => void;
  setTheme: (t: ContentTheme) => void;
  setIdeas: (i: ContentIdea[]) => void;
  selectIdea: (i: ContentIdea) => void;
  setScript: (s: ContentScript) => void;
  setDescription: (d: ContentDescription) => void;
  togglePublicationPlatform: (k: keyof PublicationChecklist) => void;
  goToStep: (s: WizardStep) => void;
  setScheduledFor: (d: string | null) => void;
  setTitle: (t: string | null) => void;
  setContentPieceId: (id: string) => void;
  setSaveState: (state: SaveState, lastSavedAt?: string) => void;
  loadFromContentPiece: (cp: ContentPiece) => void;
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
    setDescription: (d: ContentDescription) =>
      dispatch({ type: "SET_DESCRIPTION", payload: d }),
    togglePublicationPlatform: (k: keyof PublicationChecklist) =>
      dispatch({ type: "TOGGLE_PUBLICATION", payload: k }),
    goToStep: (s: WizardStep) => dispatch({ type: "GO_TO_STEP", payload: s }),
    setScheduledFor: (d: string | null) => dispatch({ type: "SET_SCHEDULED_FOR", payload: d }),
    setTitle: (t: string | null) => dispatch({ type: "SET_TITLE", payload: t }),
    setContentPieceId: (id: string) => dispatch({ type: "SET_CONTENT_PIECE_ID", payload: id }),
    setSaveState: (s: SaveState, lastSavedAt?: string) =>
      dispatch({ type: "SET_SAVE_STATE", payload: { state: s, lastSavedAt } }),
    loadFromContentPiece: (cp: ContentPiece) =>
      dispatch({ type: "LOAD_FROM_CONTENT_PIECE", payload: cp }),
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
