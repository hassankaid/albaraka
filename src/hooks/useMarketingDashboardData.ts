import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "@/components/dashboard/PeriodFilter";

export interface MarketingLead {
  id: string;
  source: string;
  created_at: string;
  raw_full_name: string | null;
  raw_email: string | null;
  raw_phone: string | null;
  contact_id: string | null;
}

export interface MarketingCall {
  id: string;
  lead_id: string;
  scheduled_at: string | null;
  status: string | null;
  outcome: string | null;
  created_at: string;
}

export interface MarketingSale {
  id: string;
  lead_id: string | null;
  sold_at: string | null;
  amount_ht: number;
  product: string | null;
  payment_status: string | null;
}

export interface MarketingTag {
  lead_id: string;
  category: string;
  key: string;
}

export interface MarketingBreakdownRow {
  source: string;
  leads: number;
  calls: number;
  sales: number;
  revenue: number;
  leadToCall: number;
  leadToSale: number;
}

export interface MarketingChannelRow {
  channel: string;
  spent: number;
}

export interface MarketingTagRow {
  category: string;
  key: string;
  leads: number;
  calls: number;
  sales: number;
  leadToCall: number;
  leadToSale: number;
  leadIds: string[];
}

export interface MarketingDashboardData {
  // Agrégats
  budget: number;
  leads: number;
  calls: number;
  sales: number;
  revenue: number;
  cpl: number;
  cpr: number;
  cac: number;
  leadToCallRate: number;
  leadToSaleRate: number;
  channelSpend: MarketingChannelRow[];
  sourceBreakdown: MarketingBreakdownRow[];
  tagBreakdown: MarketingTagRow[];
  // Données brutes (pour drill-down)
  rawLeads: MarketingLead[];
  rawCalls: MarketingCall[];
  rawSales: MarketingSale[];
  rawTags: MarketingTag[];
}

function utcToParisYmd(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

/**
 * Charge toutes les données du dashboard marketing pour une fenêtre donnée.
 * Règle unique : tous les calls/sales sont attribués à la semaine d'inscription du lead.
 */
export function useMarketingDashboardData(range: DateRange | null) {
  return useQuery({
    queryKey: [
      "marketing-dashboard",
      range ? `${range.from.toISOString()}_${range.to.toISOString()}` : "all",
    ],
    queryFn: async (): Promise<MarketingDashboardData> => {
      // ─── 1. Ads (par date Paris dans la fenêtre) ─────────────────────
      let adsQuery = (supabase as any).from("ads").select("channel, amount_spent, date");
      if (range) {
        adsQuery = adsQuery
          .gte("date", utcToParisYmd(range.from))
          .lt("date", utcToParisYmd(range.to));
      }
      const { data: adsRows, error: adsErr } = await adsQuery;
      if (adsErr) throw adsErr;

      const budget = (adsRows ?? []).reduce(
        (acc: number, r: any) => acc + Number(r.amount_spent ?? 0),
        0,
      );
      const channelMap = new Map<string, number>();
      for (const r of adsRows ?? []) {
        const ch = r.channel || "inconnu";
        channelMap.set(ch, (channelMap.get(ch) ?? 0) + Number(r.amount_spent ?? 0));
      }
      const channelSpend: MarketingChannelRow[] = Array.from(channelMap.entries())
        .map(([channel, spent]) => ({ channel, spent }))
        .sort((a, b) => b.spent - a.spent);

      // ─── 2. Leads de la fenêtre ──────────────────────────────────────
      let leadsQuery = (supabase as any)
        .from("leads")
        .select("id, source, created_at, raw_full_name, raw_email, raw_phone, contact_id");
      if (range) {
        leadsQuery = leadsQuery
          .gte("created_at", range.from.toISOString())
          .lt("created_at", range.to.toISOString());
      }
      const { data: leadRows, error: leadErr } = await leadsQuery.order("created_at", {
        ascending: false,
      });
      if (leadErr) throw leadErr;

      const rawLeads: MarketingLead[] = (leadRows ?? []) as MarketingLead[];
      const leadIds = rawLeads.map((l) => l.id);
      const leadSourceById = new Map<string, string>(
        rawLeads.map((l) => [l.id, l.source ?? "inconnu"]),
      );
      const nbLeads = rawLeads.length;

      async function fetchInChunks<T>(
        ids: string[],
        fetcher: (chunk: string[]) => Promise<T[]>,
      ): Promise<T[]> {
        if (ids.length === 0) return [];
        const out: T[] = [];
        for (let i = 0; i < ids.length; i += 500) {
          out.push(...(await fetcher(ids.slice(i, i + 500))));
        }
        return out;
      }

      // ─── 3. Calls de ces leads ───────────────────────────────────────
      const rawCalls: MarketingCall[] = await fetchInChunks(leadIds, async (chunk) => {
        const { data, error } = await (supabase as any)
          .from("calls")
          .select("id, lead_id, scheduled_at, status, outcome, created_at")
          .in("lead_id", chunk);
        if (error) throw error;
        return (data ?? []) as MarketingCall[];
      });

      const callsByLead = new Map<string, MarketingCall[]>();
      let nbCalls = 0;
      for (const c of rawCalls) {
        if (c.status === "cancelled") continue;
        nbCalls += 1;
        const arr = callsByLead.get(c.lead_id) ?? [];
        arr.push(c);
        callsByLead.set(c.lead_id, arr);
      }

      // ─── 4. Sales de ces leads ───────────────────────────────────────
      const rawSales: MarketingSale[] = await fetchInChunks(leadIds, async (chunk) => {
        const { data, error } = await (supabase as any)
          .from("sales")
          .select("id, lead_id, sold_at, amount_ht, product, payment_status, sale_type")
          .in("lead_id", chunk);
        if (error) throw error;
        return ((data ?? []) as any[])
          .filter((s) => s.sale_type !== "acompte")
          .map(
            (s) =>
              ({
                id: s.id,
                lead_id: s.lead_id,
                sold_at: s.sold_at,
                amount_ht: Number(s.amount_ht ?? 0),
                product: s.product,
                payment_status: s.payment_status,
              }) as MarketingSale,
          );
      });

      const primarySalesByLead = new Map<string, MarketingSale>();
      let revenue = 0;
      for (const s of rawSales) {
        if (!s.lead_id) continue;
        if (!primarySalesByLead.has(s.lead_id)) primarySalesByLead.set(s.lead_id, s);
        revenue += s.amount_ht;
      }
      const nbSales = primarySalesByLead.size;

      // ─── 5. Sources breakdown ────────────────────────────────────────
      const sourceStats = new Map<
        string,
        { leads: number; calls: number; sales: number; revenue: number }
      >();
      for (const l of rawLeads) {
        const src = l.source ?? "inconnu";
        const entry = sourceStats.get(src) ?? { leads: 0, calls: 0, sales: 0, revenue: 0 };
        entry.leads += 1;
        entry.calls += callsByLead.get(l.id)?.length ?? 0;
        if (primarySalesByLead.has(l.id)) entry.sales += 1;
        sourceStats.set(src, entry);
      }
      for (const s of rawSales) {
        if (!s.lead_id) continue;
        const src = leadSourceById.get(s.lead_id);
        if (!src) continue;
        const entry = sourceStats.get(src);
        if (entry) entry.revenue += s.amount_ht;
      }

      const sourceBreakdown: MarketingBreakdownRow[] = Array.from(sourceStats.entries())
        .map(([source, s]) => ({
          source,
          leads: s.leads,
          calls: s.calls,
          sales: s.sales,
          revenue: s.revenue,
          leadToCall: s.leads > 0 ? s.calls / s.leads : 0,
          leadToSale: s.leads > 0 ? s.sales / s.leads : 0,
        }))
        .sort((a, b) => b.leads - a.leads);

      // ─── 6. Tags ─────────────────────────────────────────────────────
      const rawTagRows = await fetchInChunks(leadIds, async (chunk) => {
        const { data, error } = await (supabase as any)
          .from("lead_tags")
          .select("lead_id, tag_category, tag_key")
          .in("lead_id", chunk);
        if (error) throw error;
        return (data ?? []) as any[];
      });
      const rawTags: MarketingTag[] = rawTagRows.map((t: any) => ({
        lead_id: t.lead_id,
        category: t.tag_category,
        key: t.tag_key,
      }));

      const tagMap = new Map<string, { category: string; key: string; leads: Set<string> }>();
      for (const t of rawTags) {
        const k = `${t.category}::${t.key}`;
        const entry = tagMap.get(k) ?? {
          category: t.category,
          key: t.key,
          leads: new Set<string>(),
        };
        entry.leads.add(t.lead_id);
        tagMap.set(k, entry);
      }
      const tagBreakdown: MarketingTagRow[] = Array.from(tagMap.values())
        .map((t) => {
          let calls = 0;
          let sales = 0;
          const leadIdsArr = Array.from(t.leads);
          for (const lid of leadIdsArr) {
            calls += callsByLead.get(lid)?.length ?? 0;
            if (primarySalesByLead.has(lid)) sales += 1;
          }
          const lc = t.leads.size;
          return {
            category: t.category,
            key: t.key,
            leads: lc,
            calls,
            sales,
            leadToCall: lc > 0 ? calls / lc : 0,
            leadToSale: lc > 0 ? sales / lc : 0,
            leadIds: leadIdsArr,
          };
        })
        .sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return b.leads - a.leads;
        });

      return {
        budget,
        leads: nbLeads,
        calls: nbCalls,
        sales: nbSales,
        revenue,
        cpl: nbLeads > 0 ? budget / nbLeads : 0,
        cpr: nbCalls > 0 ? budget / nbCalls : 0,
        cac: nbSales > 0 ? budget / nbSales : 0,
        leadToCallRate: nbLeads > 0 ? nbCalls / nbLeads : 0,
        leadToSaleRate: nbLeads > 0 ? nbSales / nbLeads : 0,
        channelSpend,
        sourceBreakdown,
        tagBreakdown,
        rawLeads,
        rawCalls,
        rawSales,
        rawTags,
      };
    },
  });
}
