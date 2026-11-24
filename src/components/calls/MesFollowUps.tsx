/* eslint-disable @typescript-eslint/no-explicit-any -- colonnes et table du 22/11/2026, absentes des types générés */
// « Mes follow-up » des closers (22/11/2026, demande de Sabrina) : dans une seule
// liste triée par date, les calls passés en « Follow up » et les suivis sans RDV
// (leads transmis par un setter, ajoutés par le closer lui-même).
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Loader2, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BadgeFollowUp } from "@/components/leads/FollowUp";
import { aujourdhuiParis, echeanceFollowUp } from "@/lib/leadConfig";

type CallEnriched = Tables<"calls_enriched">;

interface Suivi {
  id: string;
  lead_id: string | null;
  contact_id: string | null;
  closer_id: string;
  le: string;
  note: string | null;
}

export interface LigneFollowUp {
  cle: string;
  type: "call" | "suivi";
  nom: string;
  telephone: string | null;
  le: string | null;
  note: string | null;
  contactId: string | null;
  call?: CallEnriched;
  suiviId?: string;
}

/** Tri : sans date d'abord (à compléter), puis par date croissante. */
export function trierFollowUps(lignes: LigneFollowUp[]): LigneFollowUp[] {
  return [...lignes].sort((a, b) => (a.le || "0000").localeCompare(b.le || "0000"));
}

export default function MesFollowUps({
  calls,
  onTraiterCall,
  onOuvrirContact,
}: {
  calls: CallEnriched[];
  onTraiterCall: (c: CallEnriched) => void;
  onOuvrirContact: (contactId: string) => void;
}) {
  const { toast } = useToast();
  const [datesCalls, setDatesCalls] = useState<Map<string, string | null>>(new Map());
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [noms, setNoms] = useState<Map<string, { nom: string; tel: string | null; contactId: string | null }>>(new Map());
  const [chargement, setChargement] = useState(true);
  const [report, setReport] = useState<{ id: string; le: string } | null>(null);

  const charger = useCallback(async () => {
    const db = supabase as any;
    const [{ data: dc }, { data: sv }] = await Promise.all([
      db.from("calls").select("id, follow_up_le").eq("status", "follow_up"),
      db.from("suivis_closer").select("id, lead_id, contact_id, closer_id, le, note").eq("statut", "ouvert"),
    ]);
    setDatesCalls(new Map(((dc || []) as { id: string; follow_up_le: string | null }[]).map((x) => [x.id, x.follow_up_le])));
    const liste = (sv || []) as Suivi[];
    setSuivis(liste);
    const leadIds = liste.map((s) => s.lead_id).filter(Boolean) as string[];
    if (leadIds.length) {
      const { data: ls } = await db.from("leads_enriched").select("id, contact_id, raw_full_name, contact_full_name, raw_phone, contact_phone").in("id", leadIds);
      setNoms(new Map(((ls || []) as any[]).map((l) => [l.id, {
        nom: l.contact_full_name || l.raw_full_name || "Lead", tel: l.contact_phone || l.raw_phone || null, contactId: l.contact_id,
      }])));
    }
    setChargement(false);
  }, []);

  useEffect(() => { charger(); }, [charger, calls]);

  const lignes = useMemo(() => trierFollowUps([
    ...calls.map((c): LigneFollowUp => ({
      cle: `call-${c.id}`, type: "call", nom: c.contact_full_name || c.raw_full_name || "Prospect",
      telephone: c.contact_phone || c.raw_phone || null, le: datesCalls.get(c.id!) ?? null,
      note: c.closer_notes || null, contactId: c.contact_id, call: c,
    })),
    ...suivis.map((s): LigneFollowUp => {
      const n = s.lead_id ? noms.get(s.lead_id) : undefined;
      return {
        cle: `suivi-${s.id}`, type: "suivi", nom: n?.nom || "Lead", telephone: n?.tel || null, le: s.le,
        note: s.note, contactId: s.contact_id || n?.contactId || null, suiviId: s.id,
      };
    }),
  ]), [calls, datesCalls, suivis, noms]);

  const aujourdhui = aujourdhuiParis();
  const compte = (e: string | null) => lignes.filter((l) => (l.le ? echeanceFollowUp(l.le, aujourdhui) : null) === e).length;

  const terminer = async (id: string) => {
    const { error } = await (supabase as any).from("suivis_closer").update({ statut: "fait", fait_le: new Date().toISOString() }).eq("id", id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { toast({ title: "Suivi terminé" }); charger(); }
  };

  const reporter = async () => {
    if (!report) return;
    const { error } = await (supabase as any).from("suivis_closer").update({ le: report.le }).eq("id", report.id);
    if (error) toast({ title: "Erreur", description: error.message, variant: "destructive" });
    else { setReport(null); toast({ title: "Suivi reporté" }); charger(); }
  };

  if (chargement) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3" data-testid="mes-follow-up">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline" className="border-amber-400/60 text-amber-200">Aujourd'hui : {compte("aujourdhui")}</Badge>
        <Badge variant="outline" className="border-red-500/50 text-red-300">En retard : {compte("retard")}</Badge>
        <Badge variant="outline" className="border-pink-500/40 text-pink-200">À venir : {compte("a_venir")}</Badge>
        {compte(null) > 0 && <Badge variant="outline" className="text-muted-foreground">Sans date, à compléter : {compte(null)}</Badge>}
      </div>
      {lignes.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">Aucun follow-up en cours.</div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {lignes.map((l) => (
            <div key={l.cle} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[200px] flex-1">
                <button
                  className="text-sm font-semibold text-foreground hover:underline text-left"
                  onClick={() => l.contactId && onOuvrirContact(l.contactId)}
                >
                  {l.nom}
                </button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {l.telephone && <span>{l.telephone}</span>}
                  <span className="inline-flex items-center gap-1">
                    {l.type === "call" ? <Phone className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {l.type === "call" ? "Call en follow-up" : "Suivi sans RDV"}
                  </span>
                </div>
                {l.note && <p className="mt-1 text-xs text-muted-foreground italic line-clamp-2">« {l.note} »</p>}
              </div>
              <div className="w-[170px]">
                {l.le ? <BadgeFollowUp le={l.le} /> : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted-foreground">
                    <CalendarClock className="h-3 w-3" /> Date à fixer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {l.type === "call" ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => l.call && onTraiterCall(l.call)}>
                    {l.le ? "Traiter" : "Fixer la date"}
                  </Button>
                ) : report?.id === l.suiviId ? (
                  <>
                    <Input type="date" className="h-7 w-[140px] text-xs" min={aujourdhui} value={report.le} onChange={(e) => setReport({ id: report.id, le: e.target.value })} />
                    <Button size="sm" className="h-7 text-xs" onClick={reporter}>OK</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setReport({ id: l.suiviId!, le: l.le || aujourdhui })}>Reporter</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => terminer(l.suiviId!)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Fait
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
