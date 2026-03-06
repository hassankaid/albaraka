import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch all rows from a Supabase table, bypassing the default 1000-row limit.
 * Uses batched .range() calls to iterate through all data.
 */
export async function fetchAllRows<T = Record<string, unknown>>(
  table: string,
  select: string = "*",
  options?: {
    order?: { column: string; ascending?: boolean };
    batchSize?: number;
  }
): Promise<T[]> {
  const batchSize = options?.batchSize ?? 1000;
  const allData: T[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase.from(table).select(select).range(offset, offset + batchSize - 1);

    if (options?.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`fetchAllRows error on ${table}:`, error);
      break;
    }

    if (data && data.length > 0) {
      allData.push(...(data as T[]));
      offset += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}
