// Projets de script d'appel de l'élève (table scripts_appel, migration
// 20261013120000). La table n'est pas encore dans les types générés.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Reponses, VersionOutil } from "@/lib/scriptsAppel";

export interface ProjetScript {
  id: string;
  version: VersionOutil;
  nom: string;
  reponses: Reponses;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const cle = (userId: string | undefined, version: VersionOutil) => ["scripts-appel", userId, version] as const;

export function useProjetsScript(version: VersionOutil) {
  const { user } = useAuth();
  return useQuery({
    queryKey: cle(user?.id, version),
    enabled: !!user?.id,
    queryFn: async (): Promise<ProjetScript[]> => {
      const { data, error } = await db
        .from("scripts_appel")
        .select("id, version, nom, reponses, updated_at")
        .eq("user_id", user!.id)
        .eq("version", version)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProjetScript[];
    },
  });
}

export function useActionsProjetScript(version: VersionOutil) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const rafraichir = () => qc.invalidateQueries({ queryKey: cle(user?.id, version) });

  const creer = useMutation({
    mutationFn: async ({ nom, reponses }: { nom: string; reponses?: Reponses }): Promise<ProjetScript> => {
      const { data, error } = await db
        .from("scripts_appel")
        .insert({ user_id: user!.id, version, nom: nom.trim(), reponses: reponses ?? {} })
        .select("id, version, nom, reponses, updated_at")
        .single();
      if (error) throw error;
      return data as ProjetScript;
    },
    onSuccess: rafraichir,
  });

  const renommer = useMutation({
    mutationFn: async ({ id, nom }: { id: string; nom: string }) => {
      const { error } = await db.from("scripts_appel").update({ nom: nom.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  const dupliquer = useMutation({
    mutationFn: async (p: ProjetScript) => {
      const { error } = await db
        .from("scripts_appel")
        .insert({ user_id: user!.id, version, nom: `${p.nom} (copie)`.slice(0, 120), reponses: p.reponses });
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("scripts_appel").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  /** Enregistrement automatique des réponses (sans rafraîchir la liste à chaque frappe). */
  const enregistrer = useMutation({
    mutationFn: async ({ id, reponses }: { id: string; reponses: Reponses }) => {
      const { error } = await db.from("scripts_appel").update({ reponses }).eq("id", id);
      if (error) throw error;
    },
  });

  return { creer, renommer, dupliquer, supprimer, enregistrer, rafraichir };
}
