import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  is_also_apporteur: boolean | null;
  can_add_instagram_leads: boolean | null;
  avatar_url: string | null;
  timezone: string | null;
  onboarding_completed: boolean | null;
  collaborateur_level: string | null;
  is_active: boolean;
  is_coach: boolean | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  siret: string | null;
  bank_rib_url: string | null;
  bank_details: any;
  early_access: boolean | null;
  origin: string | null;
  discord_joined_at: string | null;
  welcome_video_completed_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, phone, is_also_apporteur, can_add_instagram_leads, avatar_url, timezone, onboarding_completed, collaborateur_level, is_active, is_coach, address, postal_code, city, country, siret, bank_rib_url, bank_details, early_access, origin, discord_joined_at, welcome_video_completed_at")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data);
  }, []);

  useEffect(() => {
    const applySessionFromHashIfPresent = async () => {
      const hash = window.location.hash?.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (!hash) return;

      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken || !refreshToken) return;

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!error) {
        const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid Supabase deadlock
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
        }

        if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      }
    );

    // THEN apply hash session if present, then read current session
    applySessionFromHashIfPresent()
      .catch(() => {
        // ignore hash parsing errors and continue with regular session flow
      })
      .finally(() => {
        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
          setSession(existingSession);
          setUser(existingSession?.user ?? null);
          if (existingSession?.user) {
            fetchProfile(existingSession.user.id).finally(() => setIsLoading(false));
          } else {
            setIsLoading(false);
          }
        });
      });

    return () => subscription.unsubscribe();
  }, [fetchProfile, navigate]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
