import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ConferenceFilter } from "@/lib/marketing/conferenceFilter";

// ─── Types ───────────────────────────────────────────────────────────
export interface MarketingLead {
  id: string;
  source: string;
  created_at: string;
  conference_date: string; // YYYY-MM-DD
  raw_full_name: string | null;
  raw_email: string | null;
  raw_phone: string | null;
  contact_id: string | null;
}

export interface MarketingCall {
  id: string;
  lead_id: string | null;
  scheduled_at: string | null;
  status: string | null;
  outcome: string | null;
  event_type: string | null;
  created_at: string;
  conference_date: string;
  raw_full_name: string | null;
  raw_email: string | null;
  raw_phone: string | null;
  contact_id: string | null;
  is_orphan: boolean;
}

export interface MarketingSale {
  id: string;
  lead_id: string | null;
  sold_at: string | null;
  amount_ht: number;
  product: string | null;
  payment_status: string | null;
  conference_date: string;
  contact_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_orphan: boolean;
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
  callsLinked: number;
  callsOrphan: number;
  salesLinked: number;
  salesOrphan: number;
  revenueOrphan: number;
  channelSpend: MarketingChannelRow[];
  sourceBreakdown: MarketingBreakdownRow[];
  tagBreakdown: MarketingTagRow[];
  rawLeads: MarketingLead[];
  rawCalls: MarketingCall[];
  rawSales: MarketingSale[];
  rawTags: MarketingTag[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

// Tous les calls (y compris INSCRIPTION CONFÉRENCE) comptent comme RDV.
// Une inscription à la conf via Calendly = un engagement du prospect, donc un RDV.

/** Calcule les bornes (UTC dates) d'une fenêtre couvrant les ads d'une plage de conf. */
function conferenceToAdsDateRange(
  filter: ConferenceFilter,
): { fromYmd: string; toYmd: string } | null {
  // Les ads sont agrégées par jour Paris (ads.date).
  // La "fenêtre d'ads" d'une conf du dim D = [dim D-7, dim D] (les 7 jours qui ont alimenté la conf).
  // Pour simple : on fait from = D-7j, to = D (inclusif côté ads pour ne rien perdre).
  // En range : from = firstConf - 7j, to = lastConf.
  if (filter.mode === "all") return null;
  if (filter.mode === "single") {
    const d = filter.date;
    const confDate = new Date(d + "T00:00:00Z");
    const fromDate = new Date(confDate.getTime() - 7 * 86400000);
    return {
      fromYmd: fromDate.toISOString().slice(0, 10),
      toYmd: d, // inclusif
    };
  }
  // range
  const from = new Date(filter.from + "T00:00:00Z");
  const fromDate = new Date(from.getTime() - 7 * 86400000);
  return {
    fromYmd: fromDate.toISOString().slice(0, 10),
    toYmd: filter.to,
  };
}

/**
 * Hook principal du dashboard marketing.
 * Filtre par conference_date (attribution cohorte), règle unique vue avec le CEO.
 */
export function useMarketingDashboardData(filter: ConferenceFilter) {
  return useQuery({
    queryKey: ["marketing-dashboard", JSON.stringify(filter)],
    queryFn: async (): Promise<MarketingDashboardData> => {
      // ─── 1. Budget Ads (par date, fenêtre antérieure qui alimente la conf) ──
      let adsQuery = (supabase as any).from("ads").select("channel, amount_spent, date");
      const adsRange = conferenceToAdsDateRange(filter);
      if (adsRange) {
        adsQuery = adsQuery
          .gte("date", adsRange.fromYmd)
          .lte("date", adsRange.toYmd);
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

      // ─── 2. Filtre sur conference_date pour leads/calls/sales ───────────
      const applyConferenceFilter = (q: any) => {
        if (filter.mode === "all") return q;
        if (filter.mode === "single") return q.eq("conference_date", filter.date);
        return q.gte("conference_date", filter.from).lte("conference_date", filter.to);
      };

      // Leads
      let leadsQuery = (supabase as any)
        .from("leads")
        .select(
          "id, source, created_at, conference_date, raw_full_name, raw_email, raw_phone, contact_id",
        );
      leadsQuery = applyConferenceFilter(leadsQuery);
      const { data: leadRows, error: leadErr } = await leadsQuery.order("created_at", {
        ascending: false,
      });
      if (leadErr) throw leadErr;
      const rawLeads: MarketingLead[] = (leadRows ?? []) as MarketingLead[];
      const leadIds = rawLeads.map((l) => l.id);
      const nbLeads = rawLeads.length;

      // Calls
      let callsQuery = (supabase as any)
        .from("calls")
        .select(
          "id, lead_id, scheduled_at, status, outcome, event_type, created_at, conference_date, raw_full_name, raw_email, raw_phone, contact_id",
        );
      callsQuery = applyConferenceFilter(callsQuery);
      const { data: callRowsRaw, error: callErr } = await callsQuery;
      if (callErr) throw callErr;

      const rawCalls: MarketingCall[] = ((callRowsRaw ?? []) as any[]).map((c) => ({
        ...c,
        is_orphan: !c.lead_id,
      }));

      const callsByLead = new Map<string, MarketingCall[]>();
      let callsLinkedCount = 0;
      let callsOrphanCount = 0;
      for (const c of rawCalls) {
        if (c.status === "cancelled") continue;
        if (c.lead_id) {
          callsLinkedCount += 1;
          const arr = callsByLead.get(c.lead_id) ?? [];
          arr.push(c);
          callsByLead.set(c.lead_id, arr);
        } else {
          callsOrphanCount += 1;
        }
      }
      const nbCalls = callsLinkedCount + callsOrphanCount;

      // Sales
      let salesQuery = (supabase as any)
        .from("sales")
        .select(
          "id, lead_id, call_id, sold_at, amount_ht, product, payment_status, sale_type, conference_date, contact_id",
        );
      salesQuery = applyConferenceFilter(salesQuery);
      const { data: saleRowsRaw, error: saleErr } = await salesQuery;
      if (saleErr) throw saleErr;

      // Résolution des contacts (pour orphelines)
      const contactIdsToFetch = new Set<string>();
      for (const s of (saleRowsRaw ?? []) as any[]) {
        if (s.sale_type !== "acompte" && !s.lead_id && s.contact_id)
          contactIdsToFetch.add(s.contact_id);
      }
      for (const c of rawCalls) {
        if (!c.lead_id && c.contact_id) contactIdsToFetch.add(c.contact_id);
      }
      const contactMap = new Map<
        string,
        { full_name: string | null; email: string | null; phone: string | null }
      >();
      if (contactIdsToFetch.size > 0) {
        const ids = Array.from(contactIdsToFetch);
        for (let i = 0; i < ids.length; i += 500) {
          const chunk = ids.slice(i, i + 500);
          const { data: cs, error: csErr } = await (supabase as any)
            .from("contacts")
            .select("id, full_name, email, phone_normalized, phone_original")
            .in("id", chunk);
          if (csErr) throw csErr;
          for (const c of cs ?? [])
            contactMap.set(c.id, {
              full_name: c.full_name,
              email: c.email,
              phone: c.phone_original || c.phone_normalized || null,
            });
        }
      }

      const rawSales: MarketingSale[] = ((saleRowsRaw ?? []) as any[])
        .filter((s) => s.sale_type !== "acompte")
        .map((s) => {
          const ct = s.contact_id ? contactMap.get(s.contact_id) : null;
          return {
            id: s.id,
            lead_id: s.lead_id,
            sold_at: s.sold_at,
            amount_ht: Number(s.amount_ht ?? 0),
            product: s.product,
            payment_status: s.payment_status,
            conference_date: s.conference_date,
            contact_id: s.contact_id,
            contact_name: ct?.full_name ?? null,
            contact_email: ct?.email ?? null,
            contact_phone: ct?.phone ?? null,
            is_orphan: !s.lead_id,
          } as MarketingSale;
        });

      // Enrichir calls orphelins avec contacts
      for (const c of rawCalls) {
        if (c.is_orphan && c.contact_id && !c.raw_full_name) {
          const ct = contactMap.get(c.contact_id);
          if (ct) {
            c.raw_full_name = ct.full_name;
            c.raw_email = c.raw_email ?? ct.email;
            c.raw_phone = c.raw_phone ?? ct.phone;
          }
        }
      }

      const primarySalesByLead = new Map<string, MarketingSale>();
      let revenueLinked = 0;
      let revenueOrphan = 0;
      let salesLinkedCount = 0;
      let salesOrphanCount = 0;
      for (const s of rawSales) {
        if (s.lead_id) {
          if (!primarySalesByLead.has(s.lead_id)) primarySalesByLead.set(s.lead_id, s);
          revenueLinked += s.amount_ht;
          salesLinkedCount = primarySalesByLead.size;
        } else {
          salesOrphanCount += 1;
          revenueOrphan += s.amount_ht;
        }
      }
      const nbSales = salesLinkedCount + salesOrphanCount;
      const revenue = revenueLinked + revenueOrphan;

      // ─── 3. Sources breakdown ─────────────────────────────────────────
      const sourceStats = new Map<
        string,
        { leads: number; calls: number; sales: number; revenue: number }
      >();
      const leadSourceById = new Map<string, string>(
        rawLeads.map((l) => [l.id, l.source ?? "inconnu"]),
      );
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

      if (callsOrphanCount > 0 || salesOrphanCount > 0) {
        sourceBreakdown.push({
          source: "inconnu",
          leads: 0,
          calls: callsOrphanCount,
          sales: salesOrphanCount,
          revenue: revenueOrphan,
          leadToCall: 0,
          leadToSale: 0,
        });
      }

      // ─── 4. Tags ──────────────────────────────────────────────────────
      let rawTagRows: any[] = [];
      if (leadIds.length > 0) {
        for (let i = 0; i < leadIds.length; i += 500) {
          const chunk = leadIds.slice(i, i + 500);
          const { data, error } = await (supabase as any)
            .from("lead_tags")
            .select("lead_id, tag_category, tag_key")
            .in("lead_id", chunk);
          if (error) throw error;
          rawTagRows = rawTagRows.concat(data ?? []);
        }
      }
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
        leadToCallRate: nbLeads > 0 ? callsLinkedCount / nbLeads : 0,
        leadToSaleRate: nbLeads > 0 ? salesLinkedCount / nbLeads : 0,
        callsLinked: callsLinkedCount,
        callsOrphan: callsOrphanCount,
        salesLinked: salesLinkedCount,
        salesOrphan: salesOrphanCount,
        revenueOrphan,
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
