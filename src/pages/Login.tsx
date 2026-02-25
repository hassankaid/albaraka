import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "@/assets/ethicarena-logo.png";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-grid-pattern p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo placeholder */}
        <div className="flex flex-col items-center space-y-2">
          <img src={logo} alt="Ethicarena" className="w-20 h-20 object-contain" />
          <h1 className="text-2xl font-bold text-foreground mt-6">Connexion</h1>
          <p className="text-muted-foreground text-sm">Espace réservé aux membres Ethicarena</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-xl p-8 space-y-6 shadow-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="vous@ethicarena.ma"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button className="w-full py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            Se connecter
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Vous êtes apporteur d'affaires ?{" "}
          <Link to="/register" className="text-primary hover:underline font-medium">
            Créer votre compte
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
