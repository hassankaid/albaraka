import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CurrentUser {
  id: string;
  email: string;
  role: string;
  full_name: string;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, role, full_name")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setUser(profile);
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
