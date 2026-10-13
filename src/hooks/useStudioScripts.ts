// Studio, bibliothèque de scripts : lecture paginée avec recherche et thème, et
// gestion (CEO). La table n'est pas encore dans les types générés.
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motsRecherche, SCRIPTS_PAR_PAGE, type ScriptStudio } from "@/lib/studio/scripts";

const db = supabase as any;
const COLONNES = "id, titre, accroche, texte, theme_id, mis_en_avant, publie, created_at";

export interface FiltresScripts {
  recherche: string;
  theme: string | null;
  /** Page de gestion : montre aussi les scripts masqués. */
  avecMasques?: boolean;
}

export function useScriptsStudio({ recherche, theme, avecMasques = false }: FiltresScripts) {
  const mots = motsRecherche(recherche);
  return useInfiniteQuery({
    queryKey: ["studio", "scripts", mots.join(" "), theme, avecMasques],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<{ scripts: ScriptStudio[]; total: number }> => {
      let q = db.from("studio_scripts").select(COLONNES, { count: "exact" });
      if (!avecMasques) q = q.eq("publie", true);
      if (theme) q = q.eq("theme_id", theme);
      for (const mot of mots) q = q.ilike("recherche", `%${mot}%`);
      const { data, error, count } = await q
        .order("mis_en_avant", { ascending: false })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + SCRIPTS_PAR_PAGE - 1);
      if (error) throw error;
      return { scripts: data ?? [], total: count ?? 0 };
    },
    getNextPageParam: (derniere, pages) => {
      const charges = pages.reduce((s, p) => s + p.scripts.length, 0);
      return charges < derniere.total ? charges : undefined;
    },
  });
}

/** Nombre de scripts publiés par thème, pour les filtres. */
export function useComptesThemesScripts() {
  return useQuery({
    queryKey: ["studio", "scripts", "comptes"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await db.from("studio_scripts").select("theme_id").eq("publie", true);
      if (error) throw error;
      const comptes: Record<string, number> = {};
      for (const r of data ?? []) if (r.theme_id) comptes[r.theme_id] = (comptes[r.theme_id] ?? 0) + 1;
      return comptes;
    },
  });
}

export type ScriptAEnregistrer = Pick<ScriptStudio, "titre" | "accroche" | "texte" | "theme_id" | "mis_en_avant" | "publie"> & {
  id?: string;
};

export function useGestionScriptsStudio() {
  const queryClient = useQueryClient();
  const rafraichir = () => queryClient.invalidateQueries({ queryKey: ["studio", "scripts"] });

  const enregistrer = useMutation({
    mutationFn: async ({ id, ...valeurs }: ScriptAEnregistrer) => {
      const { error } = id
        ? await db.from("studio_scripts").update(valeurs).eq("id", id)
        : await db.from("studio_scripts").insert(valeurs);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  const ajouterLot = useMutation({
    mutationFn: async (scripts: Omit<ScriptAEnregistrer, "id">[]) => {
      const { error } = await db.from("studio_scripts").insert(scripts);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  const modifier = useMutation({
    mutationFn: async ({ id, ...valeurs }: { id: string } & Partial<ScriptAEnregistrer>) => {
      const { error } = await db.from("studio_scripts").update(valeurs).eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("studio_scripts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: rafraichir,
  });

  return { enregistrer, ajouterLot, modifier, supprimer };
}
