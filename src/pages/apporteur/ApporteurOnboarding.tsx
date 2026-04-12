import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RefreshCw, Upload, Building2, Loader2, Check, ChevronsUpDown, Pencil, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import logo from "@/assets/al-baraka-logo.png";

interface BankDetails {
  type?: string;
  account_holder?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  bank_code?: string;
  city_code?: string;
  account_number?: string;
  rib_key?: string;
  additional_info?: string;
}

// Full list of countries with ISO codes for flag rendering
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" }, { code: "ZA", name: "Afrique du Sud" }, { code: "AL", name: "Albanie" },
  { code: "DZ", name: "Algérie" }, { code: "DE", name: "Allemagne" }, { code: "AD", name: "Andorre" },
  { code: "AO", name: "Angola" }, { code: "SA", name: "Arabie saoudite" }, { code: "AR", name: "Argentine" },
  { code: "AM", name: "Arménie" }, { code: "AU", name: "Australie" }, { code: "AT", name: "Autriche" },
  { code: "AZ", name: "Azerbaïdjan" }, { code: "BH", name: "Bahreïn" }, { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgique" }, { code: "BJ", name: "Bénin" }, { code: "BY", name: "Biélorussie" },
  { code: "BO", name: "Bolivie" }, { code: "BA", name: "Bosnie-Herzégovine" }, { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brésil" }, { code: "BN", name: "Brunei" }, { code: "BG", name: "Bulgarie" },
  { code: "BF", name: "Burkina Faso" }, { code: "BI", name: "Burundi" }, { code: "KH", name: "Cambodge" },
  { code: "CM", name: "Cameroun" }, { code: "CA", name: "Canada" }, { code: "CV", name: "Cap-Vert" },
  { code: "CF", name: "Centrafrique" }, { code: "CL", name: "Chili" }, { code: "CN", name: "Chine" },
  { code: "CY", name: "Chypre" }, { code: "CO", name: "Colombie" }, { code: "KM", name: "Comores" },
  { code: "CG", name: "Congo" }, { code: "CD", name: "Congo (RDC)" }, { code: "KR", name: "Corée du Sud" },
  { code: "CR", name: "Costa Rica" }, { code: "CI", name: "Côte d'Ivoire" }, { code: "HR", name: "Croatie" },
  { code: "CU", name: "Cuba" }, { code: "DK", name: "Danemark" }, { code: "DJ", name: "Djibouti" },
  { code: "EG", name: "Égypte" }, { code: "AE", name: "Émirats arabes unis" }, { code: "EC", name: "Équateur" },
  { code: "ES", name: "Espagne" }, { code: "EE", name: "Estonie" }, { code: "US", name: "États-Unis" },
  { code: "ET", name: "Éthiopie" }, { code: "FI", name: "Finlande" }, { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" }, { code: "GM", name: "Gambie" }, { code: "GE", name: "Géorgie" },
  { code: "GH", name: "Ghana" }, { code: "GR", name: "Grèce" }, { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinée" }, { code: "GQ", name: "Guinée équatoriale" }, { code: "GW", name: "Guinée-Bissau" },
  { code: "HT", name: "Haïti" }, { code: "HN", name: "Honduras" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hongrie" }, { code: "IN", name: "Inde" }, { code: "ID", name: "Indonésie" },
  { code: "IQ", name: "Irak" }, { code: "IR", name: "Iran" }, { code: "IE", name: "Irlande" },
  { code: "IS", name: "Islande" }, { code: "IL", name: "Israël" }, { code: "IT", name: "Italie" },
  { code: "JM", name: "Jamaïque" }, { code: "JP", name: "Japon" }, { code: "JO", name: "Jordanie" },
  { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" }, { code: "KW", name: "Koweït" },
  { code: "LA", name: "Laos" }, { code: "LV", name: "Lettonie" }, { code: "LB", name: "Liban" },
  { code: "LR", name: "Liberia" }, { code: "LY", name: "Libye" }, { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lituanie" }, { code: "LU", name: "Luxembourg" }, { code: "MK", name: "Macédoine du Nord" },
  { code: "MG", name: "Madagascar" }, { code: "MY", name: "Malaisie" }, { code: "MW", name: "Malawi" },
  { code: "MV", name: "Maldives" }, { code: "ML", name: "Mali" }, { code: "MT", name: "Malte" },
  { code: "MA", name: "Maroc" }, { code: "MU", name: "Maurice" }, { code: "MR", name: "Mauritanie" },
  { code: "YT", name: "Mayotte" }, { code: "MX", name: "Mexique" }, { code: "MD", name: "Moldavie" },
  { code: "MC", name: "Monaco" }, { code: "MN", name: "Mongolie" }, { code: "ME", name: "Monténégro" },
  { code: "MZ", name: "Mozambique" }, { code: "MM", name: "Myanmar" }, { code: "NA", name: "Namibie" },
  { code: "NP", name: "Népal" }, { code: "NI", name: "Nicaragua" }, { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" }, { code: "NO", name: "Norvège" }, { code: "NZ", name: "Nouvelle-Zélande" },
  { code: "OM", name: "Oman" }, { code: "UG", name: "Ouganda" }, { code: "UZ", name: "Ouzbékistan" },
  { code: "PK", name: "Pakistan" }, { code: "PA", name: "Panama" }, { code: "PY", name: "Paraguay" },
  { code: "NL", name: "Pays-Bas" }, { code: "PE", name: "Pérou" }, { code: "PH", name: "Philippines" },
  { code: "PL", name: "Pologne" }, { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" }, { code: "RO", name: "Roumanie" }, { code: "GB", name: "Royaume-Uni" },
  { code: "RU", name: "Russie" }, { code: "RW", name: "Rwanda" }, { code: "SN", name: "Sénégal" },
  { code: "RS", name: "Serbie" }, { code: "SL", name: "Sierra Leone" }, { code: "SG", name: "Singapour" },
  { code: "SK", name: "Slovaquie" }, { code: "SI", name: "Slovénie" }, { code: "SO", name: "Somalie" },
  { code: "SD", name: "Soudan" }, { code: "LK", name: "Sri Lanka" }, { code: "SE", name: "Suède" },
  { code: "CH", name: "Suisse" }, { code: "SR", name: "Suriname" }, { code: "SY", name: "Syrie" },
  { code: "TW", name: "Taïwan" }, { code: "TZ", name: "Tanzanie" }, { code: "TD", name: "Tchad" },
  { code: "CZ", name: "Tchéquie" }, { code: "TH", name: "Thaïlande" }, { code: "TG", name: "Togo" },
  { code: "TN", name: "Tunisie" }, { code: "TR", name: "Turquie" }, { code: "UA", name: "Ukraine" },
  { code: "UY", name: "Uruguay" }, { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yémen" }, { code: "ZM", name: "Zambie" }, { code: "ZW", name: "Zimbabwe" },
];

// Get Twemoji flag URL for a country code
function getFlagUrl(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => (0x1f1e6 + c.charCodeAt(0) - 65).toString(16))
    .join("-");
  return `https://cdn.jsdelivr.net/gh/nicedoc/flags/twemoji/${codePoints}.svg`;
}

const formatIbanInput = (iban: string) => {
  if (!iban) return "";
  return iban.replace(/(.{4})(?=.)/g, "$1 ");
};

export default function ApporteurOnboarding() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const ribInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from profile data (set during registration)
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
  const [country, setCountry] = useState(profile?.country || "");
  const [countryOpen, setCountryOpen] = useState(false);
  const [siret, setSiret] = useState(profile?.siret || "");

  // Bank
  const [bankRibUrl, setBankRibUrl] = useState<string | null>(profile?.bank_rib_url || null);
  const [bankDetails, setBankDetails] = useState<BankDetails>((profile?.bank_details as BankDetails) || {});
  const [uploadingRib, setUploadingRib] = useState(false);
  const [extractingRib, setExtractingRib] = useState(false);
  const [editBankOpen, setEditBankOpen] = useState(false);
  const [editBankForm, setEditBankForm] = useState<BankDetails>({});

  const [saving, setSaving] = useState(false);

  const hasBankData = !!(bankDetails?.iban || bankDetails?.account_holder || bankDetails?.account_number);

  const selectedCountry = COUNTRIES.find((c) => c.name === country);

  const canSubmit = useMemo(() => {
    return !!(
      firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phone.trim() && phone.length > 5 &&
      address.trim() &&
      postalCode.trim() &&
      city.trim() &&
      country.trim() &&
      (bankRibUrl || hasBankData)
    );
  }, [firstName, lastName, email, phone, address, postalCode, city, country, bankRibUrl, hasBankData]);

  const handleRibUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Fichier trop volumineux", description: "5 Mo max", variant: "destructive" }); return; }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const allowedExts = [".txt", ".docx"];
    const fileExt = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    if (!allowedTypes.includes(file.type) && !allowedExts.includes(fileExt)) { toast({ title: "Format non supporté", description: "PDF, JPG, PNG, WebP, TXT ou DOCX", variant: "destructive" }); return; }
    
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const filePath = `${user.id}/rib.${ext}`;
    
    setUploadingRib(true);
    try {
      const { error: uploadError } = await supabase.storage.from("ribs").upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: signedData } = await supabase.storage.from("ribs").createSignedUrl(filePath, 60 * 60 * 24 * 365);
      const ribUrl = signedData?.signedUrl || filePath;
      await supabase.from("profiles").update({ bank_rib_url: ribUrl }).eq("id", user.id);
      setBankRibUrl(ribUrl);
      setUploadingRib(false);
      
      setExtractingRib(true);
      try {
        const { data: extractData, error: extractError } = await supabase.functions.invoke("extract-rib-data", {
          body: { user_id: user.id, file_path: filePath },
        });
        if (extractError) throw extractError;
        if (extractData?.bank_details) {
          setBankDetails(extractData.bank_details);
          toast({ title: "Données bancaires extraites avec succès !" });
        } else if (extractData?.error) {
          throw new Error(extractData.error);
        }
      } catch {
        toast({ title: "Extraction automatique échouée", description: "Veuillez saisir vos données bancaires manuellement.", variant: "destructive" });
        openEditBank();
      } finally { setExtractingRib(false); }
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
      setUploadingRib(false);
    } finally { e.target.value = ""; }
  };

  const openEditBank = () => {
    setEditBankForm({
      type: bankDetails.type || "iban",
      account_holder: bankDetails.account_holder || "",
      iban: bankDetails.iban || "",
      bic: bankDetails.bic || "",
      bank_name: bankDetails.bank_name || "",
      bank_code: bankDetails.bank_code || "",
      city_code: bankDetails.city_code || "",
      account_number: bankDetails.account_number || "",
      rib_key: bankDetails.rib_key || "",
      additional_info: bankDetails.additional_info || "",
    });
    setEditBankOpen(true);
  };

  const handleSaveBankDetails = async () => {
    if (!user) return;
    const bankType = editBankForm.type || "iban";
    let details: BankDetails;
    if (bankType === "iban") {
      details = { type: "iban", account_holder: editBankForm.account_holder || "", iban: editBankForm.iban || "", bic: editBankForm.bic || "", bank_name: editBankForm.bank_name || "" };
    } else if (bankType === "rib_maroc") {
      details = { type: "rib_maroc", account_holder: editBankForm.account_holder || "", bank_code: editBankForm.bank_code || "", city_code: editBankForm.city_code || "", account_number: editBankForm.account_number || "", rib_key: editBankForm.rib_key || "", bic: editBankForm.bic || "", bank_name: editBankForm.bank_name || "" };
    } else {
      details = { type: "other", account_holder: editBankForm.account_holder || "", account_number: editBankForm.account_number || "", bic: editBankForm.bic || "", bank_name: editBankForm.bank_name || "", additional_info: editBankForm.additional_info || "" };
    }
    const { error } = await supabase.from("profiles").update({ bank_details: details as any }).eq("id", user.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBankDetails(details);
      setEditBankOpen(false);
      toast({ title: "Coordonnées bancaires enregistrées" });
    }
  };

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setSaving(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.toUpperCase();

    const { error } = await supabase.from("profiles").update({
      full_name: fullName,
      email: email.trim().toLowerCase(),
      phone: phone,
      address: address.trim().toUpperCase(),
      postal_code: postalCode.trim(),
      city: city.trim().toUpperCase(),
      country: country,
      siret: siret.trim() || null,
      bank_details: (hasBankData ? bankDetails : undefined) as any,
      onboarding_completed: true,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    toast({ title: "Bienvenue chez Al Baraka !" });
    // Force profile refresh
    window.location.href = "/my-space";
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern flex items-start justify-center p-4 pt-8 sm:pt-16">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <img src={logo} alt="Al Baraka" className="w-16 h-16 object-contain" />
          <h1 className="text-2xl font-bold text-foreground">Complétez votre profil</h1>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Avant d'accéder à votre espace, merci de renseigner vos informations. Elles sont nécessaires pour la facturation.
          </p>
        </div>

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
                        <img src={getFlagUrl(selectedCountry.code)} alt="" className="h-4 w-5 object-contain" />
                        {selectedCountry.name}
                      </span>
                    ) : "Sélectionner un pays"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un pays..." />
                    <CommandList>
                      <CommandEmpty>Aucun pays trouvé.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((c) => (
                          <CommandItem key={c.code} value={c.name} onSelect={() => { setCountry(c.name); setCountryOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", country === c.name ? "opacity-100" : "opacity-0")} />
                            <img src={getFlagUrl(c.code)} alt="" className="h-4 w-5 object-contain mr-2" />
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

        {/* Bank info */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Informations bancaires
              </CardTitle>
              {hasBankData && (
                <Button variant="ghost" size="sm" onClick={openEditBank} className="text-muted-foreground">
                  <Pencil className="h-4 w-4 mr-1" /> Modifier
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractingRib ? (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <div>
                  <p className="text-foreground font-medium">Extraction des données en cours...</p>
                  <p className="text-sm text-muted-foreground mt-1">Analyse du RIB par intelligence artificielle</p>
                </div>
              </div>
            ) : hasBankData ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Titulaire</p>
                    <p className="text-sm font-medium text-foreground">{bankDetails.account_holder || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Banque</p>
                    <p className="text-sm font-medium text-foreground">{bankDetails.bank_name || "—"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-1">
                  {uploadingRib ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Remplacer le RIB
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-4">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-foreground font-medium">Téléchargez votre RIB <span className="text-destructive">*</span></p>
                  <p className="text-sm text-muted-foreground mt-1">Vos données bancaires seront extraites automatiquement par IA.</p>
                </div>
                <Button variant="outline" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-2">
                  {uploadingRib ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Télécharger mon RIB (PDF, Image, TXT)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <input ref={ribInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleRibUpload} />

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

        <div className="h-8" />
      </div>

      {/* Edit Bank Modal */}
      <Dialog open={editBankOpen} onOpenChange={setEditBankOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Coordonnées bancaires</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de compte</Label>
              <Select value={editBankForm.type || "iban"} onValueChange={(v) => setEditBankForm({ ...editBankForm, type: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="iban">IBAN (Europe)</SelectItem>
                  <SelectItem value="rib_maroc">RIB Maroc</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titulaire du compte</Label>
              <Input value={editBankForm.account_holder || ""} onChange={(e) => setEditBankForm({ ...editBankForm, account_holder: e.target.value.toUpperCase() })} placeholder="PRÉNOM NOM" className="bg-background" />
            </div>

            {(editBankForm.type || "iban") === "iban" && (
              <>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={formatIbanInput(editBankForm.iban || "")}
                    onChange={(e) => { const raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase(); setEditBankForm({ ...editBankForm, iban: raw }); }}
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX" className="bg-background font-mono text-sm tracking-wide"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC</Label>
                    <Input value={editBankForm.bic || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })} placeholder="BNPAFRPP" className="bg-background font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input value={editBankForm.bank_name || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })} placeholder="BNP Paribas" className="bg-background" />
                  </div>
                </div>
              </>
            )}

            {editBankForm.type === "rib_maroc" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Code banque</Label>
                    <Input value={editBankForm.bank_code || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bank_code: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="XXX" maxLength={3} className="bg-background font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Code ville</Label>
                    <Input value={editBankForm.city_code || ""} onChange={(e) => setEditBankForm({ ...editBankForm, city_code: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="XXX" maxLength={3} className="bg-background font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Clé RIB</Label>
                    <Input value={editBankForm.rib_key || ""} onChange={(e) => setEditBankForm({ ...editBankForm, rib_key: e.target.value.replace(/\D/g, "").slice(0, 2) })} placeholder="XX" maxLength={2} className="bg-background font-mono" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Numéro de compte</Label>
                  <Input value={editBankForm.account_number || ""} onChange={(e) => setEditBankForm({ ...editBankForm, account_number: e.target.value })} placeholder="Numéro de compte" className="bg-background font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC/SWIFT</Label>
                    <Input value={editBankForm.bic || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })} placeholder="BMCEXXXX" className="bg-background font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input value={editBankForm.bank_name || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })} placeholder="BMCE Bank" className="bg-background" />
                  </div>
                </div>
              </>
            )}

            {editBankForm.type === "other" && (
              <>
                <div className="space-y-2">
                  <Label>Numéro de compte</Label>
                  <Input value={editBankForm.account_number || ""} onChange={(e) => setEditBankForm({ ...editBankForm, account_number: e.target.value })} placeholder="Numéro de compte" className="bg-background font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC/SWIFT</Label>
                    <Input value={editBankForm.bic || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })} placeholder="XXXXXXXX" className="bg-background font-mono" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input value={editBankForm.bank_name || ""} onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })} placeholder="Nom de la banque" className="bg-background" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Informations complémentaires</Label>
                  <Textarea value={editBankForm.additional_info || ""} onChange={(e) => setEditBankForm({ ...editBankForm, additional_info: e.target.value })} placeholder="Informations supplémentaires..." className="bg-background" rows={3} />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setEditBankOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveBankDetails} className="gradient-primary text-primary-foreground">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
