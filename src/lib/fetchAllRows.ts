import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"] | keyof Database["public"]["Views"];

/**
 * Lit TOUTES les lignes d'une table, au-delà de la limite de 1000 lignes par
 * requête du serveur.
 *
 * Audit perf du 11/11/2026 :
 * - les pages sont demandées 4 par 4 EN PARALLÈLE (avant : une après l'autre,
 *   soit 8 allers-retours pour 7 000 contacts) ;
 * - l'ordre se termine toujours par `id` : sans ordre stable, le serveur peut
 *   renvoyer deux fois la même ligne ou en sauter une d'une page à l'autre.
 *   Toutes les tables lues ainsi ont une colonne `id`.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: TableName,
  select: string = "*",
  options?: {
    order?: { column: string; ascending?: boolean };
    batchSize?: number;
  }
): Promise<T[]> {
  const batchSize = options?.batchSize ?? 1000;
  const enParallele = 4;
  const allData: T[] = [];
  let page = 0;
  let hasMore = true;

  const lirePage = (index: number) => {
    const offset = index * batchSize;
    let query = (supabase.from(table as any) as any).select(select);
    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }
    if (options?.order?.column !== "id") query = query.order("id", { ascending: true });
    return query.range(offset, offset + batchSize - 1);
  };

  while (hasMore) {
    const vague = await Promise.all(Array.from({ length: enParallele }, (_, i) => lirePage(page + i)));
    for (const { data, error } of vague) {
      if (error) {
        console.error(`fetchAllRows error on ${table}:`, error);
        hasMore = false;
        break;
      }
      if (data && data.length > 0) allData.push(...(data as T[]));
      if (!data || data.length < batchSize) {
        hasMore = false;
        break;
      }
    }
    page += enParallele;
  }

  return allData;
}
