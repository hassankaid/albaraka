import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gold-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="text-center relative z-10">
        <h1 className="text-7xl font-heading font-bold text-gold-gradient mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Page introuvable</p>
        <Link
          to="/dashboard"
          className="inline-block px-6 py-2.5 rounded-full gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
