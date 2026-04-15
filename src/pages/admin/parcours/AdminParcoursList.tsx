import { useAuth } from "@/hooks/useAuth";
import { Navigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllParcours } from "@/hooks/useAdminParcours";
import { Loader2, Map, ChevronRight } from "lucide-react";

export default function AdminParcoursList() {
  const { profile } = useAuth();
  if (profile?.role !== "ceo") return <Navigate to="/dashboard" replace />;

  const { data: parcours, isLoading } = useAllParcours();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" /> Parcours
        </h1>
        <p className="text-muted-foreground mt-1">
          Gère le contenu des parcours AL BARAKA et Liberty : phases, chapitres, vidéos Vimeo et ressources.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(parcours ?? []).map((p) => (
          <Link key={p.id} to={`/admin/parcours/${p.slug}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Map className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{p.titre}</h3>
                    <Badge variant="outline" className="uppercase text-xs">
                      {p.pass_type.replace("_", " ")}
                    </Badge>
                    <Badge
                      variant={p.status === "published" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  {p.subtitle && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {p.subtitle}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
