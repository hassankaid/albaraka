import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Save, Camera, Upload, FileText } from "lucide-react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

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
  const [bankDetails, setBankDetails] = useState<{ iban?: string; bic?: string; bank?: string }>({});
  const [uploadingRib, setUploadingRib] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || null);
      // Fetch extended profile fields
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
              setBankDetails(data.bank_details as any);
            }
          }
        });
    }
  }, [profile]);

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
    if (file.type !== "application/pdf") { toast({ title: "Format PDF uniquement", variant: "destructive" }); return; }
    setUploadingRib(true);
    try {
      const filePath = `ribs/${user.id}.pdf`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      await supabase.from("profiles").update({ bank_rib_url: publicUrl }).eq("id", user.id);
      setBankRibUrl(publicUrl);
      toast({ title: "RIB uploadé avec succès" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setUploadingRib(false); e.target.value = ""; }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName, phone: phone || "", address, postal_code: postalCode, city, country, siret,
      bank_details: bankDetails as any,
    }).eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour avec succès" });
    }
    setSaving(false);
  };

  if (!profile) {
    return <div className="flex items-center justify-center py-16"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Avatar */}
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
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-foreground">Informations personnelles</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <PhoneInput international defaultCountry="FR" value={phone} onChange={setPhone} placeholder="6 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <Label>SIRET</Label>
              <Input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" className="bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Adresse</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Code postal</Label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" className="bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Info */}
      <Card className="border-border/50">
        <CardHeader><CardTitle className="text-foreground">Informations bancaires</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => ribInputRef.current?.click()} disabled={uploadingRib} className="gap-2">
              {uploadingRib ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {bankRibUrl ? "Remplacer le RIB" : "Uploader un RIB (PDF)"}
            </Button>
            {bankRibUrl && (
              <a href={bankRibUrl} target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 hover:underline">
                <FileText className="h-4 w-4" /> Voir le RIB
              </a>
            )}
            <input ref={ribInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleRibUpload} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input value={bankDetails.iban || ""} onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })} placeholder="FR76 ..." className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>BIC</Label>
              <Input value={bankDetails.bic || ""} onChange={(e) => setBankDetails({ ...bankDetails, bic: e.target.value })} placeholder="BNPAFRPP" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Banque</Label>
              <Input value={bankDetails.bank || ""} onChange={(e) => setBankDetails({ ...bankDetails, bank: e.target.value })} placeholder="BNP Paribas" className="bg-background" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
        {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Enregistrer
      </Button>

      {/* Crop Modal */}
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
