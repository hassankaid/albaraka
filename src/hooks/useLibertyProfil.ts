/**
 * Le profil partagé des outils Liberty (table liberty_profil, migration
 * 20261016150000) : lu une fois, modifié en local tout de suite, et enregistré
 * champ par champ peu après la dernière frappe (liberty_profil_ecrire ne fusionne
 * que les clés envoyées). L'élève peut quitter un outil et le reprendre plus tard,
 * sur n'importe quel appareil.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Profil, Valeur } from "@/lib/liberty/outils/modele";

export type EtatEnregistrement = "enregistre" | "en_cours" | "erreur";

const DELAI = 700;

// liberty_profil et liberty_profil_ecrire sont absents des types générés (migration 20261016150000)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useLibertyProfil() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data, isLoading } = useQuery({
    queryKey: ["liberty-profil", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async (): Promise<Profil> => {
      const { data, error } = await db.from("liberty_profil").select("donnees").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return (data?.donnees ?? {}) as Profil;
    },
  });

  const [profil, setProfil] = useState<Profil>({});
  // vrai une fois les réponses de l'élève posées dans l'état local (pas seulement reçues)
  const [pret, setPret] = useState(false);
  const [etat, setEtat] = useState<EtatEnregistrement>("enregistre");
  const enAttente = useRef<Profil>({});
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charge = useRef(false);

  useEffect(() => {
    if (data && !charge.current) {
      charge.current = true;
      setProfil(data);
      setPret(true);
    }
  }, [data]);

  const envoyer = useCallback(async () => {
    if (minuterie.current) {
      clearTimeout(minuterie.current);
      minuterie.current = null;
    }
    const valeurs = enAttente.current;
    if (!Object.keys(valeurs).length) return;
    enAttente.current = {};
    setEtat("en_cours");
    const { error } = await db.rpc("liberty_profil_ecrire", { p_valeurs: valeurs });
    if (error) {
      // on garde ce qui n'est pas parti, pour le renvoyer au prochain essai
      enAttente.current = { ...valeurs, ...enAttente.current };
      setEtat("erreur");
      return;
    }
    setEtat(Object.keys(enAttente.current).length ? "en_cours" : "enregistre");
  }, []);

  const modifier = useCallback(
    (cle: string, valeur: Valeur) => {
      setProfil((p) => ({ ...p, [cle]: valeur }));
      enAttente.current[cle] = valeur ?? "";
      setEtat("en_cours");
      if (minuterie.current) clearTimeout(minuterie.current);
      minuterie.current = setTimeout(envoyer, DELAI);
    },
    [envoyer],
  );

  // en quittant la page ou l'onglet : on envoie ce qui reste
  useEffect(() => {
    const avantDeQuitter = (e: BeforeUnloadEvent) => {
      if (Object.keys(enAttente.current).length) {
        void envoyer();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", avantDeQuitter);
    return () => {
      window.removeEventListener("beforeunload", avantDeQuitter);
      void envoyer();
    };
  }, [envoyer]);

  return { profil, modifier, etat, chargement: isLoading || !pret, reessayer: envoyer };
}
