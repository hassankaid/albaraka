import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, UserCheck, MessageSquare, UserPlus } from "lucide-react";
import { formatDateTime, formatDateOnly } from "@/lib/formatDate";

interface ContactDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
  created_at: string | null;
}

interface TimelineEvent {
  type: "lead" | "call" | "sale" | "call_activity" | "lead_activity";
  id: string;
  date: string;
  data: any;
}

const STATUS_COLORS: Record<string, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  a_qualifier: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  inscrit_conference: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  faux_numero: "bg-red-300/20 text-red-300 border-red-300/30",
  pas_de_reponse: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  pas_qualifie: "bg-muted text-muted-foreground border-border",
  a_relancer: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  a_recycler: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  contacte: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  call_booke: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  converti: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  perdu: "bg-red-500/20 text-red-300 border-red-500/30",
  planifie: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  effectue: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  no_show: "bg-red-500/20 text-red-300 border-red-500/30",
  annule: "bg-muted text-muted-foreground border-border",
  pas_interesse: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  disqualifie: "bg-orange-400/20 text-orange-300 border-orange-400/30",
  non_close: "bg-red-400/20 text-red-300 border-red-400/30",
  renvoye_pole_vente: "bg-blue-600/20 text-blue-300 border-blue-600/30",
  renvoye_conference: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  rediffusion: "bg-purple-400/20 text-purple-300 border-purple-400/30",
  follow_up: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  close: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", call_booke: "Call booké",
  converti: "Close", perdu: "Perdu", planifie: "Planifié",
  effectue: "Effectué", no_show: "No show", annule: "Annulé",
  a_qualifier: "À qualifier", inscrit_conference: "Inscrit conférence", faux_numero: "Faux numéro",
  pas_de_reponse: "Pas de réponse", pas_qualifie: "Pas qualifié",
  a_relancer: "À relancer", a_recycler: "À recycler",
  close: "Close", disqualifie: "Disqualifié", pas_interesse: "Pas intéressé",
  non_close: "Non close", renvoye_pole_vente: "Renvoi Pôle Vente",
  renvoye_conference: "Renvoi Conférence", rediffusion: "Rediffusion",
  follow_up: "Follow up",
  pending: "En attente", paid: "Payé", failed: "Échoué",
};

export default function ContactSheet({
  contactId,
  open,
  onClose,
}: {
  contactId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { profile: authProfile } = useAuth();
  const userTz = authProfile?.timezone || "Europe/Paris";
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);

    const [contactRes, leadsRes, callsRes, salesRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).maybeSingle(),
      supabase.from("leads_enriched").select("*").eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("calls_enriched").select("*").eq("contact_id", contactId).order("scheduled_at", { ascending: false }),
      supabase.from("sales").select("*").eq("contact_id", contactId).order("sold_at", { ascending: false }),
    ]);

    if (contactRes.data) setContact(contactRes.data);

    const leadIds = leadsRes.data?.map((l) => l.id).filter(Boolean) as string[] || [];
    const callIds = callsRes.data?.map((c) => c.id).filter(Boolean) as string[] || [];

    // Fetch both lead_activities and call_activities in parallel
    const [leadActivitiesRes, callActivitiesRes] = await Promise.all([
      leadIds.length > 0
        ? supabase
            .from("lead_activities")
            .select("*, profiles:user_id(full_name)")
            .in("lead_id", leadIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      callIds.length > 0
        ? supabase
            .from("call_activities")
            .select("*, profiles:user_id(full_name)")
            .in("call_id", callIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    // Collect profile IDs from reassignment/unassignment fields to resolve names
    const allActivities = [
      ...(leadActivitiesRes.data || []),
      ...(callActivitiesRes.data || []),
    ];
    const profileIdsToResolve = new Set<string>();
    allActivities.forEach((a: any) => {
      if ((a.action === "reassigned" || a.action === "assigned") && a.new_value) {
        profileIdsToResolve.add(a.new_value);
      }
      // Also resolve old_value for unassigned/status_change to show old setter
      if (a.old_value && /^[0-9a-f]{8}-/.test(a.old_value)) {
        profileIdsToResolve.add(a.old_value);
      }
    });

    let profileNamesMap: Record<string, string> = {};
    const uniqueProfileIds = [...profileIdsToResolve];
    if (uniqueProfileIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", uniqueProfileIds);
      (profilesData || []).forEach((p) => {
        profileNamesMap[p.id] = p.full_name;
      });
    }

    const events: TimelineEvent[] = [];

    leadsRes.data?.forEach((l) => {
      events.push({ type: "lead", id: l.id!, date: l.created_at || "", data: l });
    });

    callsRes.data?.forEach((c) => {
      events.push({ type: "call", id: c.id!, date: c.created_at || c.scheduled_at || "", data: c });
    });

    salesRes.data?.forEach((s) => {
      events.push({ type: "sale", id: s.id, date: s.sold_at || s.created_at || "", data: s });
    });

    (leadActivitiesRes.data || []).forEach((a: any) => {
      const enriched = {
        ...a,
        _resolved_name: profileNamesMap[a.new_value] || null,
        _resolved_old_name: profileNamesMap[a.old_value] || null,
      };
      events.push({ type: "lead_activity", id: a.id, date: a.created_at || "", data: enriched });
    });

    (callActivitiesRes.data || []).forEach((a: any) => {
      const enriched = { ...a, _resolved_name: profileNamesMap[a.new_value] || null };
      events.push({ type: "call_activity", id: a.id, date: a.created_at || "", data: enriched });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    if (open && contactId) fetchData();
  }, [open, contactId, fetchData]);

  const initials = contact?.full_name
    ? contact.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !contact ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Contact introuvable
          </div>
        ) : (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <SheetTitle className="text-xl text-foreground">{contact.full_name || "Sans nom"}</SheetTitle>
                  <div className="space-y-0.5 mt-1">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="text-sm text-primary hover:underline block truncate">
                        {contact.email}
                      </a>
                    )}
                    {contact.phone_normalized && (
                      <a href={`tel:${contact.phone_normalized}`} className="text-sm text-primary hover:underline block">
                        {contact.phone_normalized}
                      </a>
                    )}
                  </div>
                  {contact.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Contact créé le {formatDateOnly(contact.created_at, userTz)}
                    </p>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="border-b border-border" />

            {/* Timeline */}
            <div className="py-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Timeline</h3>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucun événement</p>
              ) : (
                <div className="relative space-y-0">
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                  {timeline.map((event) => (
                    <div key={`${event.type}-${event.id}`} className="relative flex gap-4 pb-6 last:pb-0">
                      <TimelineDot type={event.type} action={event.type === "lead_activity" || event.type === "call_activity" ? event.data.action : undefined} />

                      <Card className="flex-1 border-border/50 bg-card/50">
                        <CardContent className="p-3 space-y-1.5">
                          {event.type === "lead" && <LeadEvent data={event.data} />}
                          {event.type === "call" && <CallEvent data={event.data} userTz={userTz} contact={contact} />}
                          {event.type === "lead_activity" && <LeadActivityEvent data={event.data} userTz={userTz} />}
                          {event.type === "call_activity" && <CallActivityEvent data={event.data} userTz={userTz} />}
                          {event.type === "sale" && <SaleEvent data={event.data} />}
                          <p className="text-xs text-muted-foreground">
                            {event.date ? formatDateTime(event.date, userTz) : "—"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ─── Timeline Dot ─── */
function TimelineDot({ type, action }: { type: string; action?: string }) {
  let className = "bg-muted border-border";
  let icon = "📌";

  if (type === "lead") {
    className = "bg-purple-500/20 border-purple-500/40";
    icon = "📥";
  } else if (type === "call") {
    className = "bg-blue-500/20 border-blue-500/40";
    icon = "📞";
  } else if (type === "sale") {
    className = "bg-emerald-500/20 border-emerald-500/40";
    icon = "💰";
  } else if (type === "lead_activity" || type === "call_activity") {
    if (action === "status_change") {
      className = "bg-blue-500/20 border-blue-500/40";
      icon = "🔄";
    } else if (action === "reassigned" || action === "assigned") {
      className = "bg-violet-500/20 border-violet-500/40";
      icon = "👤";
    } else if (action === "unassigned") {
      className = "bg-amber-500/20 border-amber-500/40";
      icon = "🔓";
    } else if (action === "note_added") {
      className = "bg-yellow-500/20 border-yellow-500/40";
      icon = "📝";
    } else {
      className = "bg-cyan-500/20 border-cyan-500/40";
      icon = "🔄";
    }
  }

  return (
    <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border ${className}`}>
      {icon}
    </div>
  );
}

/* ─── Lead Event ─── */
function LeadEvent({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">Lead entrant</p>
        {data.source_label && <span className="text-xs text-muted-foreground">- {data.source_label}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {data.status && (
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[data.status] || ""}`}>
            {STATUS_LABELS[data.status] || data.status}
          </Badge>
        )}
      </div>
      {data.apporteur_name && (
        <p className="text-xs text-muted-foreground">Apporté par {data.apporteur_name}</p>
      )}
      <div className="space-y-0.5 mt-1">
        {data.raw_full_name && <p className="text-xs text-muted-foreground">Prénom saisi : {data.raw_full_name}</p>}
        {data.raw_email && <p className="text-xs text-muted-foreground">Email saisi : {data.raw_email}</p>}
        {data.raw_phone && <p className="text-xs text-muted-foreground">Tél saisi : {data.raw_phone}</p>}
      </div>
    </>
  );
}

/* ─── Lead Activity Event ─── */
function LeadActivityEvent({ data, userTz }: { data: any; userTz: string }) {
  const userName = data.profiles?.full_name || "Inconnu";

  if (data.action === "status_change") {
    const isRecycling = data.new_value === "a_recycler";
    return (
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
          <p className="text-sm text-foreground">
            Statut lead :{" "}
            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[data.old_value] || ""}`}>
              {STATUS_LABELS[data.old_value] || data.old_value}
            </Badge>
            {" → "}
            <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[data.new_value] || ""}`}>
              {STATUS_LABELS[data.new_value] || data.new_value}
            </Badge>
          </p>
        </div>
        {isRecycling && data._resolved_old_name && (
          <p className="text-xs text-muted-foreground mt-1">Ancien setter : <strong>{data._resolved_old_name}</strong></p>
        )}
        {data.note && <p className="text-xs text-muted-foreground italic mt-1">{data.note}</p>}
        <span className="text-xs text-muted-foreground">par {userName}</span>
      </div>
    );
  }

  if (data.action === "unassigned") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-sm text-foreground">Lead désassigné de <strong>{data._resolved_old_name || data.old_value || "—"}</strong></p>
        {data.note && <span className="text-xs text-muted-foreground italic">— {data.note}</span>}
      </div>
    );
  }

  if (data.action === "reassigned") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <UserCheck className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm text-foreground">Lead réaffecté à <strong>{data._resolved_name || data.new_value || "—"}</strong></p>
        <span className="text-xs text-muted-foreground">par {userName}</span>
      </div>
    );
  }

  if (data.action === "assigned") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
        <p className="text-sm text-foreground">Lead affecté à <strong>{data._resolved_name || data.new_value || "—"}</strong></p>
        <span className="text-xs text-muted-foreground">par {userName}</span>
      </div>
    );
  }

  if (data.action === "note_added") {
    return (
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground">Note lead ajoutée par {userName}</p>
          {data.note && <p className="text-xs text-muted-foreground italic mt-1">"{data.note}"</p>}
        </div>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Activité lead : {data.action}</p>;
}

/* ─── Call Event ─── */
const EVENT_TYPE_LABELS: Record<string, string> = {
  appel_offert_vsl_a: "Appel VSL A",
  appel_offert_vsl_b: "Appel VSL B",
  appel_setting_webi: "Appel Setting Webi",
  inscription_conference: "Conférence",
  appel_organique: "Appel Organique",
};

function CallEvent({ data, userTz, contact }: { data: any; userTz: string; contact: ContactDetail | null }) {
  const typeLabel = data.event_type ? (EVENT_TYPE_LABELS[data.event_type] || data.event_type) : "Appel";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{typeLabel}</p>
        <Badge variant="outline" className={`text-xs ${STATUS_COLORS["planifie"] || ""}`}>
          {STATUS_LABELS["planifie"]}
        </Badge>
      </div>
      {data.assigned_to_name && (
        <span className="text-xs text-muted-foreground">avec {data.assigned_to_name}</span>
      )}
      {data.scheduled_at && (
        <p className="text-xs text-muted-foreground">RDV : {formatDateTime(data.scheduled_at, userTz)}</p>
      )}
      <div className="space-y-0.5 mt-1">
        {data.raw_full_name && data.raw_full_name !== contact?.full_name && (
          <p className="text-xs text-muted-foreground">Prénom saisi : {data.raw_full_name}</p>
        )}
        {data.raw_email && data.raw_email !== contact?.email && (
          <p className="text-xs text-muted-foreground">Email saisi : {data.raw_email}</p>
        )}
        {data.raw_phone && data.raw_phone !== contact?.phone_normalized && (
          <p className="text-xs text-muted-foreground">Tél saisi : {data.raw_phone}</p>
        )}
      </div>
    </>
  );
}

/* ─── Call Activity Event ─── */
function CallActivityEvent({ data, userTz }: { data: any; userTz: string }) {
  const userName = data.profiles?.full_name || "Inconnu";

  if (data.action === "status_change") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <RefreshCw className="w-4 h-4 text-blue-400 shrink-0" />
        <p className="text-sm text-foreground">
          Statut call : <strong>{STATUS_LABELS[data.old_value] || data.old_value}</strong> → <strong>{STATUS_LABELS[data.new_value] || data.new_value}</strong>
        </p>
        <span className="text-xs text-muted-foreground">par {userName}</span>
      </div>
    );
  }

  if (data.action === "note_added") {
    return (
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-muted-foreground">Note call ajoutée par {userName}</p>
          {data.note && <p className="text-xs text-muted-foreground italic mt-1">"{data.note}"</p>}
        </div>
      </div>
    );
  }

  if (data.action === "reassigned") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <UserCheck className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm text-foreground">Call réaffecté à <strong>{data._resolved_name || data.new_value || "—"}</strong></p>
        <span className="text-xs text-muted-foreground">par {userName}</span>
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">Activité call : {data.action}</p>;
}

/* ─── Sale Event ─── */
function SaleEvent({ data }: { data: any }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-foreground">Vente - {data.product}</p>
      </div>
      <p className="text-sm font-semibold text-foreground">{data.amount_ht?.toLocaleString("fr-FR")} € HT</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {data.payment_status && (
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[data.payment_status] || ""}`}>
            {STATUS_LABELS[data.payment_status] || data.payment_status}
          </Badge>
        )}
      </div>
    </>
  );
}
