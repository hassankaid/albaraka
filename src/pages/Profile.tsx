import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Save } from "lucide-react";

const TIMEZONE_OPTIONS = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Africa/Casablanca", label: "Casablanca (UTC+1)" },
  { value: "Asia/Dubai", label: "Dubaï (UTC+4)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
];

export default function Profile() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setTimezone(profile.timezone || "Europe/Paris");
    }
  }, [profile]);

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
      // Refresh profile in auth context
      window.location.reload();
    }
    setSaving(false);
  };

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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
              className="bg-background"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuseau horaire</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Choisir un fuseau horaire" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
            {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
