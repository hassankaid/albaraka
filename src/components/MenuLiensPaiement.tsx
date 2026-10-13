// Menu « Liens de paiement » du header, à côté de Discord (Sidali, 13/10/2026) : les
// formules et leurs liens à copier, sans quitter la page. Lit le catalogue de l'espace
// admin (offers), relu à chaque ouverture : une modification y apparaît aussitôt.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, Copy, ExternalLink, Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOffers, type Offer } from "@/hooks/useOffers";
import { useUserPass } from "@/hooks/useUserPass";
import { useAuth } from "@/hooks/useAuth";
import { euros, lienOffre, META_CATEGORIE, offresParCategorie } from "@/lib/liensPaiement";

function LigneOffre({ offre }: { offre: Offer }) {
  const { toast } = useToast();
  const maxi = Math.max(1, offre.max_installments_count);
  const mini = Math.max(1, Math.min(offre.min_installments_count ?? 1, maxi));
  // Comme la page « Liens de paiement » : le plus grand nombre de mensualités par défaut.
  const [mensualites, setMensualites] = useState(maxi);
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(lienOffre(offre, mensualites));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
      toast({ title: "Lien copié", description: `${offre.label.trim()} · ${mensualites > 1 ? `${mensualites} fois` : "1 fois"}` });
    } catch {
      toast({ title: "Copie impossible", variant: "destructive" });
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2" data-testid="ligne-offre">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{offre.label.trim()}</div>
        <div className="text-[11px] text-muted-foreground">
          {euros(offre.default_price_ht)}
          {mensualites > 1 && ` · ${euros(Math.round(offre.default_price_ht / mensualites))} × ${mensualites}`}
        </div>
      </div>
      {maxi > mini && (
        <Select value={String(mensualites)} onValueChange={(v) => setMensualites(Number(v))}>
          <SelectTrigger className="h-8 w-[78px] text-xs" aria-label={`Nombre de mensualités pour ${offre.label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: maxi - mini + 1 }, (_, i) => mini + i).map((n) => (
              <SelectItem key={n} value={String(n)} className="text-xs">
                {n === 1 ? "1 fois" : `${n} fois`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <button
        type="button"
        onClick={copier}
        title="Copier le lien"
        aria-label={`Copier le lien ${offre.label}`}
        className="flex h-8 shrink-0 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {copie ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copie ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

export function MenuLiensPaiement() {
  const { profile } = useAuth();
  const { hasAnyPass } = useUserPass();
  const { data: offres, refetch } = useOffers();
  const [ouvert, setOuvert] = useState(false);

  // Tous les élèves avec un pass actif (Sidali, 13/10/2026), et le CEO.
  if (profile?.role !== "ceo" && !hasAnyPass) return null;
  const groupes = offresParCategorie(offres ?? []);

  return (
    <Popover
      open={ouvert}
      onOpenChange={(o) => {
        setOuvert(o);
        if (o) refetch(); // le catalogue de l'admin, relu à chaque ouverture
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Liens de paiement"
          aria-label="Liens de paiement"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary"
          data-testid="bouton-liens-paiement"
        >
          <Link2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="hidden sm:inline">Liens de paiement</span>
          <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 sm:inline" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(400px,calc(100vw-1.5rem))] p-0">
        <div className="border-b px-3 py-2.5">
          <div className="text-sm font-semibold">Liens de paiement</div>
          <div className="text-xs text-muted-foreground">Choisis la formule et le nombre de fois, puis copie le lien pour ton prospect.</div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {groupes.map(({ categorie, titre, offres: liste }) => {
            const Icone = META_CATEGORIE[categorie].icon;
            return (
              <div key={categorie} className="border-b last:border-b-0">
                <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icone className={`h-3.5 w-3.5 ${META_CATEGORIE[categorie].color}`} /> {titre}
                </div>
                {liste.map((o) => (
                  <LigneOffre key={o.id} offre={o} />
                ))}
              </div>
            );
          })}
        </div>
        <Link
          to="/working/lien-de-paiement"
          onClick={() => setOuvert(false)}
          className="flex items-center justify-center gap-1.5 border-t px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Voir tous les liens (avec date de démarrage)
        </Link>
      </PopoverContent>
    </Popover>
  );
}
