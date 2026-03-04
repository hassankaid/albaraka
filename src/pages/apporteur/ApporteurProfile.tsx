import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Save, Camera, Upload, FileText, Download, CheckCircle2, AlertTriangle, Pencil, Building2, Loader2 } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface BankDetails {
  type?: string;
  account_holder?: string;
  iban?: string;
  bic?: string;
  bank_name?: string;
  // RIB Maroc fields
  bank_code?: string;
  city_code?: string;
  account_number?: string;
  rib_key?: string;
  // Other fields
  additional_info?: string;
}

const COUNTRIES = [
  "France", "Belgique", "Suisse", "Luxembourg", "Canada",
  "Maroc", "Tunisie", "Algérie", "Sénégal", "Côte d'Ivoire",
  "Cameroun", "Madagascar", "Comores", "Mayotte", "Réunion",
  "Allemagne", "Espagne", "Italie", "Portugal", "Royaume-Uni",
  "Pays-Bas", "Autre",
];

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed")); }, "image/webp", 0.9);
  });
}

export default function ApporteurProfile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [siret, setSiret] = useState("");
  const [saving, setSaving] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ribInputRef = useRef<HTMLInputElement>(null);

  // Crop
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Bank
  const [bankRibUrl, setBankRibUrl] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetails>({});
  const [uploadingRib, setUploadingRib] = useState(false);
  const [extractingRib, setExtractingRib] = useState(false);
  const [editBankOpen, setEditBankOpen] = useState(false);
  const [editBankForm, setEditBankForm] = useState<BankDetails>({});

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || null);
      supabase.from("profiles").select("address, postal_code, city, country, siret, bank_rib_url, bank_details")
        .eq("id", profile.id).maybeSingle().then(({ data }) => {
          if (data) {
            setAddress(data.address || "");
            setPostalCode(data.postal_code || "");
            setCity(data.city || "");
            setCountry(data.country || "");
            setSiret(data.siret || "");
            setBankRibUrl(data.bank_rib_url || null);
            if (data.bank_details && typeof data.bank_details === "object") {
              setBankDetails(data.bank_details as BankDetails);
            }
          }
        });
    }
  }, [profile]);

  // ── Completion check ──
  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!fullName.trim()) missing.push("Nom complet");
    if (!phone?.trim()) missing.push("Téléphone");
    if (!address.trim()) missing.push("Adresse");
    if (!postalCode.trim()) missing.push("Code postal");
    if (!city.trim()) missing.push("Ville");
    if (!country.trim()) missing.push("Pays");
    // SIRET is optional — not included in missing fields
    if (!bankRibUrl) missing.push("RIB");
    const hasValidBank = bankDetails?.type === "iban" ? !!bankDetails?.iban : bankDetails?.type === "rib_maroc" ? !!bankDetails?.account_number : !!bankDetails?.account_number;
    if (!hasValidBank && !bankDetails?.iban) missing.push("Coordonnées bancaires");
    return missing;
  }, [fullName, phone, address, postalCode, city, country, siret, bankRibUrl, bankDetails]);

  const isComplete = missingFields.length === 0;

  const initials = fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Fichier trop volumineux", description: "2 Mo max", variant: "destructive" }); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast({ title: "Format non supporté", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setImageSrc(reader.result as string); setCrop({ x: 0, y: 0 }); setZoom(1); setCropModalOpen(true); };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;
    setCropModalOpen(false);
    setUploading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filePath = `${user.id}.webp`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: urlWithCacheBust }).eq("id", user.id);
      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Avatar mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setUploading(false); setImageSrc(null); }
  };

  const handleRibUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Fichier trop volumineux", description: "5 Mo max", variant: "destructive" }); return; }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith(".txt")) { toast({ title: "Format non supporté", description: "PDF, JPG, PNG, WebP ou TXT", variant: "destructive" }); return; }
    
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
      
      // Start extraction
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
      } catch (extractErr: any) {
        console.error("Extraction failed:", extractErr);
        toast({ title: "Extraction automatique échouée", description: "Veuillez saisir vos données bancaires manuellement.", variant: "destructive" });
        openEditBank();
      } finally {
        setExtractingRib(false);
      }
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
      setUploadingRib(false);
    } finally { e.target.value = ""; }
  };

  const handleSavePersonal = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, phone: phone || "", address, postal_code: postalCode, city, country, siret,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Informations personnelles enregistrées" });
    }
    setSaving(false);
  };

  const handleSaveBankDetails = async () => {
    if (!user) return;
    const bankType = editBankForm.type || "iban";
    let details: BankDetails;

    if (bankType === "iban") {
      details = {
        type: "iban",
        account_holder: editBankForm.account_holder || "",
        iban: editBankForm.iban || "",
        bic: editBankForm.bic || "",
        bank_name: editBankForm.bank_name || "",
      };
    } else if (bankType === "rib_maroc") {
      details = {
        type: "rib_maroc",
        account_holder: editBankForm.account_holder || "",
        bank_code: editBankForm.bank_code || "",
        city_code: editBankForm.city_code || "",
        account_number: editBankForm.account_number || "",
        rib_key: editBankForm.rib_key || "",
        bic: editBankForm.bic || "",
        bank_name: editBankForm.bank_name || "",
      };
    } else {
      details = {
        type: "other",
        account_holder: editBankForm.account_holder || "",
        account_number: editBankForm.account_number || "",
        bic: editBankForm.bic || "",
        bank_name: editBankForm.bank_name || "",
        additional_info: editBankForm.additional_info || "",
      };
    }

    const { error } = await supabase.from("profiles").update({
      bank_details: details as any,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setBankDetails(details);
      setEditBankOpen(false);
      toast({ title: "Coordonnées bancaires enregistrées" });
    }
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

  const formatIban = (iban: string) => {
    if (!iban) return "—";
    const clean = iban.replace(/\s/g, "");
    if (clean.length <= 8) return clean;
    return `${clean.slice(0, 4)} ${"XXXX ".repeat(Math.max(0, Math.floor((clean.length - 8) / 4)))}${clean.slice(-4)}`;
  };

  const formatIbanInput = (iban: string) => {
    if (!iban) return "";
    return iban.replace(/(.{4})(?=.)/g, "$1 ");
  };

  if (!profile) {
    return <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const hasBankData = !!(bankDetails?.iban || bankDetails?.account_holder || bankDetails?.account_number);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Mon Profil</h2>

      {/* ── Completion indicator ── */}
      {isComplete ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-300">Profil complet — vous êtes prêt à recevoir vos factures</span>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <span className="text-sm font-medium text-amber-300">Profil incomplet</span>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Éléments manquants : {missingFields.join(", ")}
          </p>
        </div>
      )}

      {/* ── Avatar ── */}
      <Card className="border-border/50">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="relative group cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
            <Avatar className="h-20 w-20 text-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials || "?"}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploading ? <RefreshCw className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground text-lg">{profile.full_name}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <Badge variant="outline" className="mt-1 text-xs bg-primary/10 text-primary border-primary/20">Apporteur d'affaires</Badge>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
        </CardContent>
      </Card>

      {/* ── Section 1: Personal Info ── */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-foreground">Informations personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom complet <span className="text-destructive">*</span></Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone <span className="text-destructive">*</span></Label>
              <PhoneInput international defaultCountry="FR" value={phone} onChange={setPhone} placeholder="6 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" className="bg-background" />
              <p className="text-xs text-muted-foreground">À remplir uniquement si vous avez une société.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse <span className="text-destructive">*</span></Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 rue de la Paix" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Code postal <span className="text-destructive">*</span></Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Ville <span className="text-destructive">*</span></Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Pays <span className="text-destructive">*</span></Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Sélectionner un pays" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSavePersonal} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      {/* ── Section 2: Bank Info ── */}
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
            /* ── Extraction in progress ── */
            <div className="text-center py-8 space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
              <div>
                <p className="text-foreground font-medium">Extraction des données en cours...</p>
                <p className="text-sm text-muted-foreground mt-1">Analyse du RIB par intelligence artificielle</p>
              </div>
              <div className="w-48 mx-auto">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          ) : !bankRibUrl && !hasBankData ? (
            /* ── No RIB uploaded ── */
            <div className="text-center py-6 space-y-4">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-foreground font-medium">Aucun RIB enregistré</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Veuillez télécharger votre RIB pour recevoir vos commissions.
                </p>
              </div>
              <Button variant="outline" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-2">
                {uploadingRib ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Télécharger mon RIB (PDF, Image, TXT)
              </Button>
            </div>
          ) : hasBankData ? (
            /* ── Bank details exist ── */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Titulaire</p>
                  <p className="text-sm font-medium text-foreground">{bankDetails.account_holder || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Banque</p>
                  <p className="text-sm font-medium text-foreground">{bankDetails.bank_name || "—"}</p>
                </div>
                {(!bankDetails.type || bankDetails.type === "iban") && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">IBAN</p>
                      <p className="text-sm font-mono text-foreground">{formatIban(bankDetails.iban || "")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BIC</p>
                      <p className="text-sm font-mono text-foreground">{bankDetails.bic || "—"}</p>
                    </div>
                  </>
                )}
                {bankDetails.type === "rib_maroc" && (
                  <>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">RIB</p>
                      <p className="text-sm font-mono text-foreground">
                        {`${bankDetails.bank_code || ""}${bankDetails.city_code || ""}${bankDetails.account_number || ""}${bankDetails.rib_key || ""}` || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                      <p className="text-sm font-mono text-foreground">{bankDetails.bic || "—"}</p>
                    </div>
                  </>
                )}
                {bankDetails.type === "other" && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground">Compte</p>
                      <p className="text-sm font-mono text-foreground">{bankDetails.account_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">BIC/SWIFT</p>
                      <p className="text-sm font-mono text-foreground">{bankDetails.bic || "—"}</p>
                    </div>
                    {bankDetails.additional_info && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Info</p>
                        <p className="text-sm text-foreground">{bankDetails.additional_info}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                {bankRibUrl ? (
                  <>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>RIB uploadé</span>
                    </div>
                    <a href={bankRibUrl} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Download className="h-3 w-3" /> Télécharger
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-1">
                      {uploadingRib ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      Remplacer
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-1">
                    {uploadingRib ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    Uploader un RIB
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* ── RIB uploaded but no bank details yet ── */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-300">RIB uploadé — coordonnées bancaires à compléter</p>
                  <p className="text-xs text-muted-foreground">Veuillez saisir manuellement vos coordonnées IBAN ci-dessous.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href={bankRibUrl!} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Download className="h-3 w-3" /> Voir le RIB
                  </Button>
                </a>
                <Button variant="outline" size="sm" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-1">
                  {uploadingRib ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                  Remplacer
                </Button>
              </div>
              <Button onClick={openEditBank} className="gradient-primary text-primary-foreground gap-2">
                <Pencil className="h-4 w-4" /> Saisir mes coordonnées bancaires
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <input ref={ribInputRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,text/plain,.txt" className="hidden" onChange={handleRibUpload} />

      {/* ── Edit Bank Details Modal ── */}
      <Dialog open={editBankOpen} onOpenChange={setEditBankOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Coordonnées bancaires</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type de compte</Label>
              <Select value={editBankForm.type || "iban"} onValueChange={(v) => setEditBankForm({ ...editBankForm, type: v })}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iban">IBAN (Europe)</SelectItem>
                  <SelectItem value="rib_maroc">RIB Maroc</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titulaire du compte</Label>
              <Input
                value={editBankForm.account_holder || ""}
                onChange={(e) => setEditBankForm({ ...editBankForm, account_holder: e.target.value.toUpperCase() })}
                placeholder="PRÉNOM NOM"
                className="bg-background"
              />
            </div>

            {/* IBAN fields */}
            {(editBankForm.type || "iban") === "iban" && (
              <>
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={formatIbanInput(editBankForm.iban || "")}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                      setEditBankForm({ ...editBankForm, iban: raw });
                    }}
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    className="bg-background font-mono text-sm tracking-wide"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC</Label>
                    <Input
                      value={editBankForm.bic || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })}
                      placeholder="BNPAFRPP"
                      className="bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input
                      value={editBankForm.bank_name || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })}
                      placeholder="BNP Paribas"
                      className="bg-background"
                    />
                  </div>
                </div>
              </>
            )}

            {/* RIB Maroc fields */}
            {editBankForm.type === "rib_maroc" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Code banque</Label>
                    <Input
                      value={editBankForm.bank_code || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bank_code: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      placeholder="XXX"
                      maxLength={3}
                      className="bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code ville</Label>
                    <Input
                      value={editBankForm.city_code || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, city_code: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                      placeholder="XXX"
                      maxLength={3}
                      className="bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clé RIB</Label>
                    <Input
                      value={editBankForm.rib_key || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, rib_key: e.target.value.replace(/\D/g, "").slice(0, 2) })}
                      placeholder="XX"
                      maxLength={2}
                      className="bg-background font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Numéro de compte</Label>
                  <Input
                    value={editBankForm.account_number || ""}
                    onChange={(e) => setEditBankForm({ ...editBankForm, account_number: e.target.value })}
                    placeholder="Numéro de compte"
                    className="bg-background font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC/SWIFT</Label>
                    <Input
                      value={editBankForm.bic || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })}
                      placeholder="BMCEXXXX"
                      className="bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input
                      value={editBankForm.bank_name || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })}
                      placeholder="BMCE Bank"
                      className="bg-background"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Other fields */}
            {editBankForm.type === "other" && (
              <>
                <div className="space-y-2">
                  <Label>Numéro de compte</Label>
                  <Input
                    value={editBankForm.account_number || ""}
                    onChange={(e) => setEditBankForm({ ...editBankForm, account_number: e.target.value })}
                    placeholder="Numéro de compte"
                    className="bg-background font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BIC/SWIFT</Label>
                    <Input
                      value={editBankForm.bic || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bic: e.target.value.toUpperCase() })}
                      placeholder="XXXXXXXX"
                      className="bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom de la banque</Label>
                    <Input
                      value={editBankForm.bank_name || ""}
                      onChange={(e) => setEditBankForm({ ...editBankForm, bank_name: e.target.value })}
                      placeholder="Nom de la banque"
                      className="bg-background"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Informations complémentaires</Label>
                  <Textarea
                    value={editBankForm.additional_info || ""}
                    onChange={(e) => setEditBankForm({ ...editBankForm, additional_info: e.target.value })}
                    placeholder="Informations supplémentaires..."
                    className="bg-background"
                    rows={3}
                  />
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

      {/* ── Crop Modal ── */}
      <Dialog open={cropModalOpen} onOpenChange={(open) => { if (!open) { setCropModalOpen(false); setImageSrc(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Recadrer l'image</DialogTitle></DialogHeader>
          <div className="relative w-full h-72 bg-muted rounded-lg overflow-hidden">
            {imageSrc && <Cropper image={imageSrc} crop={crop} zoom={zoom} minZoom={1} maxZoom={5} aspect={1} cropShape="round" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={5} step={0.05} className="flex-1" />
            <span className="text-xs text-muted-foreground w-10 text-right">{zoom.toFixed(1)}×</span>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCropModalOpen(false); setImageSrc(null); }}>Annuler</Button>
            <Button onClick={handleCropConfirm} className="gradient-primary text-primary-foreground">Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
