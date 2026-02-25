import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { formatDateTime, formatDateOnly } from "@/lib/formatDate";

interface ContactDetail {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
  created_at: string | null;
}

interface TimelineEvent {
  type: "lead" | "call" | "sale";
  id: string;
  date: string;
  data: any;
}

const STATUS_COLORS: Record<string, string> = {
  nouveau: "bg-muted text-muted-foreground border-border",
  contacte: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  call_booke: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  converti: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  perdu: "bg-red-500/20 text-red-300 border-red-500/30",
  planifie: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  effectue: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  no_show: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  annule: "bg-red-500/20 text-red-300 border-red-500/30",
  pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  paid: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
};

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", call_booke: "Call booké",
  converti: "Converti", perdu: "Perdu", planifie: "Planifié",
  effectue: "Effectué", no_show: "No-show", annule: "Annulé",
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

    const events: TimelineEvent[] = [];

    leadsRes.data?.forEach((l) => {
      events.push({ type: "lead", id: l.id!, date: l.created_at || "", data: l });
    });

    callsRes.data?.forEach((c) => {
      events.push({ type: "call", id: c.id!, date: c.scheduled_at || "", data: c });
    });

    salesRes.data?.forEach((s) => {
      events.push({ type: "sale", id: s.id, date: s.sold_at || s.created_at || "", data: s });
    });

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setTimeline(events);
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    if (open && contactId) fetchData();
  }, [open, contactId, fetchData]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copié` });
  };

  const initials = contact?.full_name
    ? contact.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  const waLink = contact?.phone_normalized
    ? `https://wa.me/${contact.phone_normalized.replace("+", "")}`
    : null;

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
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

                  {timeline.map((event, i) => (
                    <div key={`${event.type}-${event.id}`} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Dot */}
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                        event.type === "lead"
                          ? "bg-purple-500/20 border border-purple-500/40"
                          : event.type === "call"
                          ? "bg-blue-500/20 border border-blue-500/40"
                          : "bg-emerald-500/20 border border-emerald-500/40"
                      }`}>
                        {event.type === "lead" ? "📥" : event.type === "call" ? "📞" : "💰"}
                      </div>

                      {/* Content */}
                      <Card className="flex-1 border-border/50 bg-card/50">
                        <CardContent className="p-3 space-y-1.5">
                          {event.type === "lead" && (
                            <LeadEvent data={event.data} contact={contact} />
                          )}
                          {event.type === "call" && (
                            <CallEvent data={event.data} userTz={userTz} contact={contact} />
                          )}
                          {event.type === "sale" && (
                            <SaleEvent data={event.data} />
                          )}
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

function LeadEvent({ data, contact }: { data: any; contact: ContactDetail | null }) {
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
        {data.assigned_to_name && (
          <span className="text-xs text-muted-foreground">Assigné à {data.assigned_to_name}</span>
        )}
      </div>
      {data.apporteur_name && (
        <p className="text-xs text-muted-foreground">Apporté par {data.apporteur_name}</p>
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  appel_offert_vsl_a: "Appel VSL A",
  appel_offert_vsl_b: "Appel VSL B",
  appel_setting_webi: "Appel Setting Webi",
  inscription_conference: "Conférence",
  appel_organique: "Appel Organique",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  appel_offert_vsl_a: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  appel_offert_vsl_b: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  appel_setting_webi: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  inscription_conference: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  appel_organique: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
};

function CallEvent({ data, userTz, contact }: { data: any; userTz: string; contact: ContactDetail | null }) {
  const typeLabel = data.event_type ? (EVENT_TYPE_LABELS[data.event_type] || data.event_type) : "Appel";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-foreground">{typeLabel}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {data.status && (
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[data.status] || ""}`}>
            {STATUS_LABELS[data.status] || data.status}
          </Badge>
        )}
        {data.assigned_to_name && (
          <span className="text-xs text-muted-foreground">avec {data.assigned_to_name}</span>
        )}
      </div>
      {data.status === "annule" && data.canceled_at && (
        <p className="text-xs text-muted-foreground">
          Annulé le {formatDateTime(data.canceled_at, userTz)}
          {data.canceled_by_name ? ` par ${data.canceled_by_name}` : ""}
        </p>
      )}
      {data.status === "effectue" && data.outcome && (
        <p className="text-xs text-foreground">Résultat : {data.outcome}</p>
      )}
      {data.status === "effectue" && data.notes && (
        <p className="text-xs text-muted-foreground italic">{data.notes}</p>
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
