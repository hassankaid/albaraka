import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ViewAsProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  collaborateur_level: string | null;
  is_also_apporteur: boolean | null;
  can_add_instagram_leads: boolean | null;
  avatar_url: string | null;
  timezone: string | null;
  is_active: boolean;
}

interface ViewAsContextType {
  viewAsProfile: ViewAsProfile | null;
  startViewAs: (profile: ViewAsProfile) => void;
  stopViewAs: () => void;
  isViewingAs: boolean;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsProfile, setViewAsProfile] = useState<ViewAsProfile | null>(null);

  const startViewAs = useCallback((profile: ViewAsProfile) => {
    setViewAsProfile(profile);
  }, []);

  const stopViewAs = useCallback(() => {
    setViewAsProfile(null);
  }, []);

  return (
    <ViewAsContext.Provider value={{ viewAsProfile, startViewAs, stopViewAs, isViewingAs: !!viewAsProfile }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (!context) throw new Error("useViewAs must be used within ViewAsProvider");
  return context;
}
