/**
 * Wizard d'onboarding apporteur — 2 étapes :
 *   1. Signe ton contrat (si un contrat pending_signature existe)
 *   2. Complète ton profil (formulaire personal info + adresse)
 *
 * Le step courant est déduit du state BDD (pas de state local) :
 *   - Tant qu'un contrat est en pending_signature → step "contract"
 *   - Dès qu'il n'y en a plus → step "profile"
 *   - Après la soumission du profil → onboarding_completed=true → redirection
 *     vers la 1re vidéo du parcours (logique Sprint T).
 *
 * Le passage de l'étape 1 à 2 se fait via le callback `onSigned` de
 * <ContractSignaturePanel /> qui refetch les contrats. Le component
 * re-render automatiquement avec currentStep='profile'.
 */

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Check, ChevronsUpDown, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import logo from "@/assets/al-baraka-logo-v2.png";
import { COUNTRIES, findCountryByName, normalizeForSearch } from "@/lib/countries";
import { resolveCountryName } from "@/lib/countryUtils";
import * as Flags from "country-flag-icons/string/3x2";
import { useMyContracts } from "@/hooks/useMyContracts";
import { ContractSignaturePanel } from "@/pages/contract/ContractSignaturePanel";

function CountryFlag({ code, className }: { code: string; className?: string }) {
  const svg = (Flags as Record<string, string>)[code.toUpperCase()];
  if (!svg) return null;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Stepper visuel                                                            */
/* -------------------------------------------------------------------------- */

function StepperIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 select-none">
      {Array.from({ length: total }).map((_, idx) => {
        const step = idx + 1;
        const isDone = step < current;
        const isCurrent = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center text-xs font-semibold transition-colors",
                isDone && "bg-primary border-primary text-primary-foreground",
                isCurrent && "border-primary text-primary",
                !isDone && !isCurrent && "border-muted-foreground/30 text-muted-foreground",
              )}
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Étape ${step}${isDone ? " terminée" : ""}`}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : step}
            </div>
            {step < total ? (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  isDone ? "bg-primary" : "bg-muted-foreground/30",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function ApporteurOnboarding() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  // Charge les contrats du user (filtrés via RLS = uniquement les siens)
  const { data: contracts, isLoading: contractsLoading, refetch: refetchContracts } =
    useMyContracts();
  const pendingContract = useMemo(
    () => contracts?.find((c) => c.status === "pending_signature"),
    [contracts],
  );
  const hasPendingContract = pendingContract != null;
  const currentStep: "contract" | "profile" = hasPendingContract ? "contract" : "profile";

  if (contractsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header avec logo + titre + stepper */}
        <div className="flex flex-col items-center space-y-3">
          <img src={logo} alt="Al Baraka" className="w-16 h-16 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">
            {currentStep === "contract" ? "Signe ton contrat" : "Complète ton profil"}
          </h1>
          <StepperIndicator current={currentStep === "contract" ? 1 : 2} total={2} />
          <p className="text-muted-foreground text-sm text-center max-w-md">
            {currentStep === "contract"
              ? "Lis ton contrat et signe-le pour activer ta formation."
              : "Avant d'accéder à ton espace, merci de renseigner tes informations. Elles sont nécessaires pour la facturation."}
          </p>
        </div>

        {currentStep === "contract" ? (
          <ContractSignaturePanel
            contract={pendingContract!}
            compact
            onSigned={async () => {
              // Le refetch va retourner les contrats updated : le contrat
              // signé n'apparaîtra plus comme pending → currentStep passe
              // automatiquement à 'profile'.
              await refetchContracts();
            }}
          />
        ) : (
          <ProfileFormSection
            profile={profile}
            userId={user?.id ?? null}
            onSubmit={async (payload) => {
              if (!user) return;
              const { error } = await supabase
                .from("profiles")
                .update({ ...payload, onboarding_completed: true })
                .eq("id", user.id);

              if (error) {
                toast({ title: "Erreur", description: error.message, variant: "destructive" });
                return;
              }

              toast({ title: "Bienvenue chez Al Baraka !" });

              // Sprint T (18/05/2026) : redirection finale adaptée selon le
              // pass actif :
              //   - Pass AL BARAKA → 1er chapitre du parcours "al-baraka"
              //   - Pass Liberty   → 1er chapitre du parcours "liberty" si défini
              //   - Formation à la carte (aucun pass) → /training direct
              let targetPath = "/training";
              try {
                const { data: passes } = await supabase
                  .from("user_passes")
                  .select("pass_type")
                  .eq("user_id", user.id)
                  .is("revoked_at", null);
                const passTypes = (passes ?? []).map((p) => p.pass_type as string);
                const parcoursSlug = passTypes.includes("al_baraka")
                  ? "al-baraka"
                  : passTypes.includes("liberty")
                    ? "liberty"
                    : null;

                if (parcoursSlug) {
                  const { data: parc } = await supabase
                    .from("parcours")
                    .select(
                      `id, parcours_phases(id, ordre, parcours_chapitres(id, ordre))`,
                    )
                    .eq("slug", parcoursSlug)
                    .maybeSingle();
                  const phases = (parc?.parcours_phases ?? []).slice().sort(
                    (a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre,
                  );
                  const firstPhase = phases[0];
                  const chapters = (firstPhase?.parcours_chapitres ?? []).slice().sort(
                    (a: { ordre: number }, b: { ordre: number }) => a.ordre - b.ordre,
                  );
                  const firstChapter = chapters[0];
                  if (firstChapter?.id) {
                    targetPath = `/parcours/${parcoursSlug}/chapitre/${firstChapter.id}`;
                  }
                }
              } catch {
                /* fallback vers /training */
              }
              // Force profile refresh
              window.location.href = targetPath;
            }}
          />
        )}

        <div className="h-8" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Étape 2 — Formulaire profil                                               */
/* -------------------------------------------------------------------------- */

interface ProfileFormPayload {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  siret: string | null;
}

interface ProfileFormSectionProps {
  profile: ReturnType<typeof useAuth>["profile"];
  userId: string | null;
  onSubmit: (payload: ProfileFormPayload) => Promise<void>;
}

function ProfileFormSection({ profile, userId, onSubmit }: ProfileFormSectionProps) {
  const nameParts = (profile?.full_name || "").split(" ");
  const initialFirstName = nameParts.slice(0, -1).join(" ") || nameParts[0] || "";
  const initialLastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";

  // Form state
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email, setEmail] = useState(profile?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [postalCode, setPostalCode] = useState(profile?.postal_code || "");
  const [city, setCity] = useState(profile?.city || "");
  const [country, setCountry] = useState(resolveCountryName(profile?.country));
  const [countryOpen, setCountryOpen] = useState(false);
  const [siret, setSiret] = useState(profile?.siret || "");

  const [saving, setSaving] = useState(false);

  const selectedCountry = findCountryByName(country);

  const canSubmit = useMemo(() => {
    return !!(
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phone.trim() && phone.length > 5 &&
      address.trim() &&
      postalCode.trim() &&
      city.trim() &&
      country.trim()
    );
  }, [firstName, lastName, email, phone, address, postalCode, city, country]);

  const handleSubmit = async () => {
    if (!userId || !canSubmit) return;
    setSaving(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase();
    try {
      await onSubmit({
        full_name: fullName,
        email: email.trim().toLowerCase(),
        phone: phone,
        address: address.trim().toUpperCase(),
        postal_code: postalCode.trim(),
        city: city.trim().toUpperCase(),
        country: country,
        siret: siret.trim() || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Personal info */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-foreground">Informations personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom <span className="text-destructive">*</span></Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Nom <span className="text-destructive">*</span></Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Dupont" className="bg-background" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse e-mail <span className="text-destructive">*</span></Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="vous@exemple.com" className="bg-background" />
          </div>

          <div className="space-y-2">
            <Label>Numéro de téléphone <span className="text-destructive">*</span></Label>
            <PhoneInput
              defaultCountry="fr"
              value={phone}
              onChange={setPhone}
              inputClassName="!bg-background !border-input !text-foreground !rounded-r-md !h-10 !w-full"
              countrySelectorStyleProps={{
                buttonClassName: "!bg-background !border-input !h-10 !rounded-l-md",
                dropdownStyleProps: {
                  className: "!bg-popover !border-border !text-popover-foreground",
                  listItemClassName: "!hover:bg-accent",
                },
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>SIRET</Label>
            <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" className="bg-background" />
            <p className="text-xs text-muted-foreground">À remplir uniquement si vous avez une société.</p>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-foreground">Adresse postale</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adresse <span className="text-destructive">*</span></Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 rue de la Paix" className="bg-background" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Code postal <span className="text-destructive">*</span></Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Ville <span className="text-destructive">*</span></Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className="bg-background" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Pays <span className="text-destructive">*</span></Label>
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full justify-between bg-background font-normal">
                  {selectedCountry ? (
                    <span className="flex items-center gap-2">
                      <CountryFlag code={selectedCountry.code} className="h-4 w-6 rounded-sm overflow-hidden border border-border/30" />
                      {selectedCountry.name}
                    </span>
                  ) : "Sélectionner un pays"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command
                  filter={(value, search) => {
                    const n = normalizeForSearch(value);
                    const s = normalizeForSearch(search);
                    return n.includes(s) ? 1 : 0;
                  }}
                >
                  <CommandInput placeholder="Rechercher un pays..." />
                  <CommandList>
                    <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map((c) => (
                        <CommandItem key={c.code} value={c.name} onSelect={() => { setCountry(c.name); setCountryOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", country === c.name ? "opacity-100" : "opacity-0")} />
                          <CountryFlag code={c.code} className="h-4 w-6 rounded-sm overflow-hidden border border-border/30 mr-2" />
                          {c.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || saving}
        className="w-full py-3 gradient-primary text-primary-foreground font-semibold text-base"
        size="lg"
      >
        {saving ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <UserCheck className="h-5 w-5 mr-2" />}
        Valider et accéder à mon espace
      </Button>
    </>
  );
}
