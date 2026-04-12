import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export function DeactivatedAccountScreen() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>Compte désactivé</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground space-y-4">
          <p>
            Votre compte collaborateur a été désactivé. Si vous pensez qu'il s'agit d'une erreur,
            contactez l'administration Ethicarena.
          </p>
          <Button onClick={() => signOut()} variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
