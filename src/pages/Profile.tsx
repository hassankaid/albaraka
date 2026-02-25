import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Save, Camera, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";

const TIMEZONES = [
  { value: "Europe/Paris", label: "Paris", group: "Europe" },
  { value: "Europe/London", label: "Londres", group: "Europe" },
  { value: "Europe/Berlin", label: "Berlin", group: "Europe" },
  { value: "Europe/Madrid", label: "Madrid", group: "Europe" },
  { value: "Europe/Rome", label: "Rome", group: "Europe" },
  { value: "Europe/Brussels", label: "Bruxelles", group: "Europe" },
  { value: "Europe/Amsterdam", label: "Amsterdam", group: "Europe" },
  { value: "Europe/Zurich", label: "Zurich", group: "Europe" },
  { value: "Europe/Moscow", label: "Moscou", group: "Europe" },
  { value: "Africa/Casablanca", label: "Casablanca", group: "Afrique" },
  { value: "Africa/Algiers", label: "Alger", group: "Afrique" },
  { value: "Africa/Tunis", label: "Tunis", group: "Afrique" },
  { value: "Africa/Cairo", label: "Le Caire", group: "Afrique" },
  { value: "Africa/Johannesburg", label: "Johannesburg", group: "Afrique" },
  { value: "Africa/Lagos", label: "Lagos", group: "Afrique" },
  { value: "Asia/Dubai", label: "Dubaï", group: "Moyen-Orient" },
  { value: "Asia/Riyadh", label: "Riyad", group: "Moyen-Orient" },
  { value: "Asia/Qatar", label: "Qatar", group: "Moyen-Orient" },
  { value: "Asia/Kuwait", label: "Koweït", group: "Moyen-Orient" },
  { value: "Asia/Beirut", label: "Beyrouth", group: "Moyen-Orient" },
  { value: "Asia/Jerusalem", label: "Jérusalem", group: "Moyen-Orient" },
  { value: "Asia/Istanbul", label: "Istanbul", group: "Moyen-Orient" },
  { value: "Asia/Singapore", label: "Singapour", group: "Asie" },
  { value: "Asia/Hong_Kong", label: "Hong Kong", group: "Asie" },
  { value: "Asia/Tokyo", label: "Tokyo", group: "Asie" },
  { value: "Asia/Shanghai", label: "Shanghai", group: "Asie" },
  { value: "Asia/Seoul", label: "Séoul", group: "Asie" },
  { value: "Asia/Bangkok", label: "Bangkok", group: "Asie" },
  { value: "Asia/Jakarta", label: "Jakarta", group: "Asie" },
  { value: "Asia/Kolkata", label: "Mumbai", group: "Asie" },
  { value: "America/New_York", label: "New York", group: "Amérique" },
  { value: "America/Los_Angeles", label: "Los Angeles", group: "Amérique" },
  { value: "America/Chicago", label: "Chicago", group: "Amérique" },
  { value: "America/Toronto", label: "Toronto", group: "Amérique" },
  { value: "America/Montreal", label: "Montréal", group: "Amérique" },
  { value: "America/Mexico_City", label: "Mexico", group: "Amérique" },
  { value: "America/Sao_Paulo", label: "São Paulo", group: "Amérique" },
  { value: "America/Buenos_Aires", label: "Buenos Aires", group: "Amérique" },
  { value: "Australia/Sydney", label: "Sydney", group: "Océanie" },
  { value: "Australia/Melbourne", label: "Melbourne", group: "Océanie" },
  { value: "Pacific/Auckland", label: "Auckland", group: "Océanie" },
];

const GROUPS = ["Europe", "Afrique", "Moyen-Orient", "Asie", "Amérique", "Océanie"];

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

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/webp", 0.9);
  });
}

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [saving, setSaving] = useState(false);
  const [tzOpen, setTzOpen] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop modal
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setTimezone(profile.timezone || "Europe/Paris");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "2 Mo maximum", variant: "destructive" });
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Format non supporté", description: "JPG, PNG ou WebP uniquement", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;

    setCropModalOpen(false);
    setUploading(true);

    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const filePath = `${user.id}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, blob, { upsert: true, contentType: "image/webp" });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCacheBust })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast({ title: "Avatar mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setImageSrc(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, timezone })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profil mis à jour avec succès" });
      window.location.reload();
    }
    setSaving(false);
  };

  const selectedTz = TIMEZONES.find((tz) => tz.value === timezone);

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mon profil</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez vos informations personnelles</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Informations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="relative group cursor-pointer"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              <Avatar className="h-24 w-24 text-lg">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-white" />
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {uploading ? "Upload en cours..." : "JPG, PNG ou WebP • 2 Mo max"}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-background" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 12 34 56 78" className="bg-background" />
            </div>

            <div className="space-y-2">
              <Label>Fuseau horaire</Label>
              <Popover open={tzOpen} onOpenChange={setTzOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={tzOpen} className="w-full justify-between bg-background font-normal">
                    {selectedTz ? `${selectedTz.label} (${selectedTz.group})` : "Choisir un fuseau horaire"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Rechercher un fuseau..." />
                    <CommandList>
                      <CommandEmpty>Aucun fuseau trouvé.</CommandEmpty>
                      {GROUPS.map((group) => (
                        <CommandGroup key={group} heading={group}>
                          {TIMEZONES.filter((tz) => tz.group === group).map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={`${tz.label} ${tz.group}`}
                              onSelect={() => { setTimezone(tz.value); setTzOpen(false); }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", timezone === tz.value ? "opacity-100" : "opacity-0")} />
                              {tz.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={handleSave} disabled={saving || uploading} className="w-full gradient-primary text-primary-foreground">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Crop Modal */}
      <Dialog open={cropModalOpen} onOpenChange={(open) => { if (!open) { setCropModalOpen(false); setImageSrc(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recadrer l'image</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-72 bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setCropModalOpen(false); setImageSrc(null); }}>
              Annuler
            </Button>
            <Button onClick={handleCropConfirm} className="gradient-primary text-primary-foreground">
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
