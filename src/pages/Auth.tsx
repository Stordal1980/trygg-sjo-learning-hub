import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Anchor } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Velkommen tilbake!",
          description: "Du er nå logget inn.",
        });
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;

        toast({
          title: "Registrering vellykket!",
          description: "Du kan nå logge inn med din konto.",
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: "Feil",
        description: error.message || "Noe gikk galt. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Anchor className="h-10 w-10" aria-hidden="true" />
            <h1 className="text-3xl font-bold">Trygg Sjø</h1>
          </div>
          <p className="text-muted-foreground">
            Lær båtsikkerhet og redningsregler
          </p>
        </div>

        <Card className="fade-in shadow-xl" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle>{isLogin ? "Logg inn" : "Opprett konto"}</CardTitle>
            <CardDescription>
              {isLogin
                ? "Logg inn for å fortsette læringen"
                : "Registrer deg for å få tilgang til kursene"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4" autoComplete="on">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Fullt navn</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Ola Nordmann"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    aria-required={!isLogin}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="din@epost.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-required="true"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passord</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  aria-required="true"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Vennligst vent..." : isLogin ? "Logg inn" : "Opprett konto"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin
                  ? "Har du ikke konto? Registrer deg"
                  : "Har du allerede konto? Logg inn"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
