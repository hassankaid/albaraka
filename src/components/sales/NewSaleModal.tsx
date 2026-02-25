import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_normalized: string | null;
}

interface NewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const PRODUCT_OPTIONS = ["Formation Setting", "Formation Closing", "Pack Complet"];

export default function NewSaleModal({ open, onOpenChange, onCreated }: NewSaleModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [contactSearch, setContactSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showResults, setShowResults] = useState(false);

  const [product, setProduct] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [amountHt, setAmountHt] = useState("");
  const [soldAt, setSoldAt] = useState<Date>(new Date());
  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!contactSearch || contactSearch.length < 2) {
      setContacts([]);
      return;
    }
    const timer = setTimeout(async () => {
      const search = `%${contactSearch}%`;
      const { data } = await supabase
        .from("contacts")
        .select("id, full_name, email, phone_normalized")
        .or(`full_name.ilike.${search},email.ilike.${search},phone_normalized.ilike.${search}`)
        .limit(8);
      setContacts(data || []);
      setShowResults(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch]);

  const resetForm = () => {
    setContactSearch("");
    setSelectedContact(null);
    setContacts([]);
    setProduct("");
    setCustomProduct("");
    setAmountHt("");
    setSoldAt(new Date());
    setPaymentStatus("pending");
    setShowResults(false);
  };

  const handleSubmit = async () => {
    if (!selectedContact || !amountHt || !profile) return;
    const finalProduct = product === "__custom" ? customProduct : product;
    if (!finalProduct) return;

    setSubmitting(true);
    try {
      // Find associated lead
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase.from("sales").insert({
        contact_id: selectedContact.id,
        lead_id: lead?.id || null,
        product: finalProduct,
        amount_ht: parseFloat(amountHt),
        sold_at: soldAt.toISOString(),
        payment_status: paymentStatus,
        closed_by: profile.id,
      });

      if (error) throw error;

      // Update lead status
      if (lead?.id) {
        await supabase.from("leads").update({ status: "converti" }).eq("id", lead.id);
      }

      toast({ title: "Vente créée avec succès" });
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch {
      toast({ title: "Erreur lors de la création", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle vente</DialogTitle>
          <DialogDescription>Enregistrez une nouvelle vente et associez-la à un contact.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact search */}
          <div className="space-y-2">
            <Label>Contact *</Label>
            {selectedContact ? (
              <div className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/30">
                <div>
                  <p className="font-semibold text-foreground">{selectedContact.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{selectedContact.email} · {selectedContact.phone_normalized}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedContact(null); setContactSearch(""); }}>
                  Changer
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, téléphone…"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-9"
                  onFocus={() => contacts.length > 0 && setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                />
                {showResults && contacts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors"
                        onMouseDown={() => { setSelectedContact(c); setShowResults(false); }}
                      >
                        <p className="font-medium text-sm text-foreground">{c.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.email} · {c.phone_normalized}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product */}
          <div className="space-y-2">
            <Label>Produit *</Label>
            <Select value={product} onValueChange={setProduct}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un produit" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
                <SelectItem value="__custom">Autre (saisie libre)</SelectItem>
              </SelectContent>
            </Select>
            {product === "__custom" && (
              <Input placeholder="Nom du produit" value={customProduct} onChange={(e) => setCustomProduct(e.target.value)} />
            )}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Montant HT (€) *</Label>
            <Input type="number" placeholder="0" value={amountHt} onChange={(e) => setAmountHt(e.target.value)} />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date de vente</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !soldAt && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(soldAt, "dd MMMM yyyy", { locale: fr })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={soldAt} onSelect={(d) => d && setSoldAt(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment status */}
          <div className="space-y-2">
            <Label>Statut paiement</Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedContact || !amountHt || (!product || (product === "__custom" && !customProduct))}
            className="gradient-primary text-primary-foreground"
          >
            {submitting ? "Création…" : "Créer la vente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
