import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "@/components/dashboard/PeriodFilter";

export interface MarketingBreakdownRow {
  source: string;
  leads: number;
  calls: number;
  sales: number;
  revenue: number;
  leadToCall: number; // 0..1
  leadToSale: number; // 0..1
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
}

export interface MarketingDashboardData {
  budget: number;
  leads: number;
  calls: number;
  sales: number;
  revenue: number;
  cpl: number; // budget / leads
  cpr: number; // budget / calls
  cac: number; // budget / sales
  leadToCallRate: number;
  leadToSaleRate: number;
  channelSpend: MarketingChannelRow[];
  sourceBreakdown: MarketingBreakdownRow[];
  tagBreakdown: MarketingTagRow[];
}

/** Convertit une Date UTC en date YYYY-MM-DD locale Paris (pour filtrer ads.date). */
function utcToParisYmd(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA donne déjà YYYY-MM-DD
  return fmt.format(d);
}

/**
 * Charge toutes les données du dashboard marketing pour une fenêtre donnée.
 * Règle unique : tous les calls/sales sont attribués à la semaine d'inscription du lead,
 * peu importe la date effective du call ou de la vente.
 *
 * - range = null → "Tout" (pas de filtre temporel)
 */
export function useMarketingDashboardData(range: DateRange | null) {
  return useQuery({
    queryKey: [
      "marketing-dashboard",
      range ? `${range.from.toISOString()}_${range.to.toISOString()}` : "all",
    ],
    queryFn: async (): Promise<MarketingDashboardData> => {
      // ─── 1. Budget ads (par date Paris dans la fenêtre) ─────────────
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
        .select("id, source, created_at");
      if (range) {
        leadsQuery = leadsQuery
          .gte("created_at", range.from.toISOString())
          .lt("created_at", range.to.toISOString());
      }
      const { data: leadRows, error: leadErr } = await leadsQuery;
      if (leadErr) throw leadErr;

      const leadIds: string[] = (leadRows ?? []).map((l: any) => l.id);
      const leadSourceById = new Map<string, string>();
      for (const l of leadRows ?? []) {
        leadSourceById.set(l.id, l.source ?? "inconnu");
      }
      const nbLeads = leadIds.length;

      // ─── 3. Calls de ces leads (cohorte, sans filtre date sur calls) ──
      let callRows: any[] = [];
      if (leadIds.length > 0) {
        // Supabase peut avoir une limite sur le .in() — on chunk si > 1000.
        const chunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 500) chunks.push(leadIds.slice(i, i + 500));
        for (const c of chunks) {
          const { data, error } = await (supabase as any)
            .from("calls")
            .select("id, lead_id, status")
            .in("lead_id", c);
          if (error) throw error;
          callRows = callRows.concat(data ?? []);
        }
      }
      // On ne compte pas les calls annulés (status='cancelled') : un RDV cancelled n'est
      // pas un vrai RDV pris. Mais on inclut tout le reste (scheduled, completed, no_show).
      const callsByLead = new Map<string, number>();
      let nbCalls = 0;
      for (const c of callRows) {
        if (c.status === "cancelled") continue;
        nbCalls += 1;
        callsByLead.set(c.lead_id, (callsByLead.get(c.lead_id) ?? 0) + 1);
      }

      // ─── 4. Sales de ces leads (cohorte) ─────────────────────────────
      let saleRows: any[] = [];
      if (leadIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 500) chunks.push(leadIds.slice(i, i + 500));
        for (const c of chunks) {
          const { data, error } = await (supabase as any)
            .from("sales")
            .select("id, lead_id, amount_ht, sale_type")
            .in("lead_id", c);
          if (error) throw error;
          saleRows = saleRows.concat(data ?? []);
        }
      }
      // Un lead peut avoir plusieurs lignes (installments) — on dédoublonne par lead pour
      // le compte de "ventes uniques". Le CA total somme toutes les amount_ht primaires.
      const primarySalesByLead = new Map<string, number>(); // lead_id → 1 si sale primaire
      let revenue = 0;
      for (const s of saleRows) {
        if (!s.lead_id) continue;
        // On ne considère que la vente primaire pour le comptage (pas les sub-ventes d'installments)
        // Un 'acompte' est un paiement partiel rattaché à une vente principale : ne pas recompter.
        if (s.sale_type === "acompte") continue;
        primarySalesByLead.set(s.lead_id, 1);
        revenue += Number(s.amount_ht ?? 0);
      }
      const nbSales = primarySalesByLead.size;

      // ─── 5. Répartition par source lead ──────────────────────────────
      const sourceStats = new Map<
        string,
        { leads: number; calls: number; sales: number; revenue: number }
      >();
      for (const l of leadRows ?? []) {
        const src = l.source ?? "inconnu";
        const entry = sourceStats.get(src) ?? { leads: 0, calls: 0, sales: 0, revenue: 0 };
        entry.leads += 1;
        entry.calls += callsByLead.get(l.id) ?? 0;
        if (primarySalesByLead.has(l.id)) entry.sales += 1;
        sourceStats.set(src, entry);
      }
      // CA par source : on réattribue les sales aux leads
      for (const s of saleRows) {
        if (!s.lead_id) continue;
        // Un 'acompte' est un paiement partiel rattaché à une vente principale : ne pas recompter.
        if (s.sale_type === "acompte") continue;
        const src = leadSourceById.get(s.lead_id);
        if (!src) continue;
        const entry = sourceStats.get(src);
        if (entry) entry.revenue += Number(s.amount_ht ?? 0);
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

      // ─── 6. Répartition par tag ──────────────────────────────────────
      let tagRows: any[] = [];
      if (leadIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < leadIds.length; i += 500) chunks.push(leadIds.slice(i, i + 500));
        for (const c of chunks) {
          const { data, error } = await (supabase as any)
            .from("lead_tags")
            .select("lead_id, tag_category, tag_key")
            .in("lead_id", c);
          if (error) throw error;
          tagRows = tagRows.concat(data ?? []);
        }
      }
      // Pour chaque (category, key) : unique leads, calls, sales
      const tagMap = new Map<
        string,
        { category: string; key: string; leads: Set<string> }
      >();
      for (const t of tagRows) {
        const k = `${t.tag_category}::${t.tag_key}`;
        const entry = tagMap.get(k) ?? {
          category: t.tag_category,
          key: t.tag_key,
          leads: new Set<string>(),
        };
        entry.leads.add(t.lead_id);
        tagMap.set(k, entry);
      }

      const tagBreakdown: MarketingTagRow[] = Array.from(tagMap.values())
        .map((t) => {
          let calls = 0;
          let sales = 0;
          for (const lid of t.leads) {
            calls += callsByLead.get(lid) ?? 0;
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
          };
        })
        .sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return b.leads - a.leads;
        });

      // ─── 7. Agrégats globaux ────────────────────────────────────────
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
      };
    },
  });
}
