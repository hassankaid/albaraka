import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "loading" | "recovery" | "expired" | "requestSent";

const ResetPassword = () => {
  const [mode, setMode] = useState<Mode>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [expiredReason, setExpiredReason] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash || "";
    const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

    // Cas 1 : Supabase renvoie une erreur dans le hash (lien expiré / déjà utilisé / invalide)
    const errCode = hashParams.get("error_code");
    const errDescription = hashParams.get("error_description");
    if (errCode || hashParams.get("error")) {
      setExpiredReason(errDescription?.replace(/\+/g, " ") || errCode || "Le lien n'est plus valide.");
      setMode("expired");
      return;
    }

    // Cas 2 : lien de recovery valide (hash contient type=recovery + access_token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("recovery");
    });

    if (hash.includes("type=recovery") && hash.includes("access_token")) {
      setMode("recovery");
    } else {
      // Cas 3 : page ouverte sans hash → pas venue d'un email
      // On attend 1.5s au cas où Supabase déclenche l'event, sinon on considère expiré
      const t = setTimeout(() => {
        setMode((prev) => (prev === "loading" ? "expired" : prev));
      }, 1500);
      return () => {
        clearTimeout(t);
        subscription.unsubscribe();
      };
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/dashboard"), 2000);
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      toast({ title: "Entre ton email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resendEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setMode("requestSent");
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden p-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md space-y-8 relative z-10">{children}</div>
    </div>
  );

  // État loading (le temps de détecter le type de lien)
  if (mode === "loading") {
    return shell(
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <p className="text-sm">Vérification du lien…</p>
      </div>
    );
  }

  // Lien invalide / expiré → formulaire de demande d'un nouveau lien
  if (mode === "expired") {
    return shell(
      <>
        <div className="flex flex-col items-center space-y-3">
          <img src={logo} alt="Al Baraka" className="w-48 h-auto object-contain rounded-lg" />
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent mt-2" />
          <h1 className="text-2xl font-heading font-semibold text-foreground mt-4 text-center">
            Lien invalide ou expiré
          </h1>
          <p className="text-muted-foreground text-sm text-center max-w-sm">
            Ce lien a déjà été utilisé ou n'est plus valide. Pas de souci — entre ton email ci-dessous pour en recevoir un nouveau.
          </p>
        </div>

        <form onSubmit={handleRequestNewLink} className="bg-card/80 backdrop-blur-sm border border-gold-500/10 rounded-xl p-8 space-y-6 gold-glow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ton adresse email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="vous@email.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            Recevoir un nouveau lien
          </button>
        </form>

        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </button>
      </>
    );
  }

  // Nouveau lien envoyé
  if (mode === "requestSent") {
    return shell(
      <>
        <div className="flex flex-col items-center space-y-3">
          <img src={logo} alt="Al Baraka" className="w-48 h-auto object-contain rounded-lg" />
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent mt-2" />
          <h1 className="text-2xl font-heading font-semibold text-foreground mt-4">Email envoyé</h1>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-4 text-center space-y-2">
          <CheckCircle className="h-5 w-5 inline-block" />
          <p>Un nouveau lien vient de t'être envoyé à <strong>{resendEmail}</strong>.</p>
          <p className="text-xs opacity-80">Vérifie ta boîte mail (et tes spams). Le lien est valable 7 jours.</p>
        </div>
        <button
          onClick={() => navigate("/login")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </button>
      </>
    );
  }

  // Lien recovery valide → formulaire de définition du mot de passe
  return shell(
    <>
      <div className="flex flex-col items-center space-y-3">
        <img src={logo} alt="Al Baraka" className="w-48 h-auto object-contain rounded-lg" />
        <div className="w-16 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent mt-2" />
        <h1 className="text-2xl font-heading font-semibold text-foreground mt-4">Définis ton mot de passe</h1>
        <p className="text-muted-foreground text-sm text-center">
          Choisis un mot de passe sécurisé pour accéder à ton espace AL BARAKA
        </p>
      </div>

      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg p-4 text-center flex items-center justify-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Mot de passe mis à jour ! Redirection...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card/80 backdrop-blur-sm border border-gold-500/10 rounded-xl p-8 space-y-6 gold-glow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
            {confirm.length > 0 && password === confirm && password.length >= 6 && (
              <p className="text-xs text-emerald-500">Les mots de passe correspondent</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            Activer mon accès
          </button>
        </form>
      )}
    </>
  );
};

export default ResetPassword;
