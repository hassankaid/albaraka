import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle, Mail, ArrowLeft, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Mode = "loading" | "recovery" | "expired" | "requestSent";

// ─── Règles de validation du mot de passe ────────────────────────────
const PASSWORD_RULES = [
  { key: "length", label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
  { key: "lower", label: "Une lettre minuscule (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "Une lettre majuscule (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "Un chiffre (0-9)", test: (p: string) => /\d/.test(p) },
  { key: "special", label: "Un caractère spécial (!@#$…)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
] as const;

// ─── Traduction FR des messages d'erreur Supabase ────────────────────
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("token has expired") || m.includes("invalid") && m.includes("token")) {
    return "Le lien a expiré ou n'est plus valide. Demande-en un nouveau.";
  }
  if (m.includes("auth session missing") || m.includes("session_not_found")) {
    return "Session introuvable. Reclique sur le lien dans ton email.";
  }
  if (m.includes("new password should be different")) {
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  }
  if (m.includes("password should be at least") || m.includes("weak password") || m.includes("password is too weak")) {
    return "Mot de passe trop faible. Respecte toutes les règles ci-dessous.";
  }
  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Trop de tentatives. Réessaie dans quelques minutes.";
  }
  if (m.includes("user not found") || m.includes("user_not_found")) {
    return "Aucun compte ne correspond à cet email.";
  }
  if (m.includes("email") && m.includes("invalid")) {
    return "Adresse email invalide.";
  }
  if (m.includes("network") || m.includes("failed to fetch")) {
    return "Problème de connexion. Vérifie ta connexion internet.";
  }
  // Fallback : message générique en français + détail technique
  return `Erreur : ${message}`;
}

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

  // État de validation des règles de mot de passe (pour UI + bouton)
  const ruleStates = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) })),
    [password],
  );
  const allRulesOk = ruleStates.every((r) => r.ok);
  const passwordsMatch = confirm.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesOk) {
      toast({
        title: "Mot de passe trop faible",
        description: "Toutes les règles doivent être respectées.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Erreur",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
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
      toast({
        title: "Erreur",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
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
                minLength={8}
                className="w-full pl-10 pr-10 py-2.5 bg-transparent border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Checklist des règles — visible dès qu'on tape, pour guider l'user */}
            {password.length > 0 && (
              <ul className="grid grid-cols-1 gap-1 pt-1 text-xs">
                {ruleStates.map((rule) => (
                  <li
                    key={rule.key}
                    className={`flex items-center gap-1.5 ${rule.ok ? "text-emerald-500" : "text-muted-foreground"}`}
                  >
                    {rule.ok ? (
                      <Check className="h-3 w-3 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 shrink-0 opacity-50" />
                    )}
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            )}
            {password.length === 0 && (
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-0.5">
                8 caractères minimum, avec au moins une minuscule, une majuscule, un chiffre et un caractère spécial.
              </p>
            )}
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
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
            {passwordsMatch && allRulesOk && (
              <p className="text-xs text-emerald-500 flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Les mots de passe correspondent
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !allRulesOk || !passwordsMatch}
            className="w-full py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
