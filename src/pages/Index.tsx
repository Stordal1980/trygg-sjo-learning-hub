import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Anchor, Shield, BookOpen, MessageSquare, CheckCircle2 } from "lucide-react";
import heroImage from "@/assets/hero-boat.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(10, 37, 64, 0.7), rgba(10, 37, 64, 0.9)), url(${heroImage})`,
          }}
          role="img"
          aria-label="Båt som seiler trygt i norske fjorder"
        />
        
        <div className="relative z-10 container mx-auto px-4 text-center text-white fade-in">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Anchor className="h-16 w-16" aria-hidden="true" />
            <h1 className="text-6xl md:text-7xl font-bold">Trygg Sjø</h1>
          </div>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Lær båtsikkerhet og redningsregler gjennom interaktive 360° videoer
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Kom i gang
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="text-lg px-8"
              onClick={() => navigate("/auth")}
            >
              Logg inn
            </Button>
          </div>
        </div>

        {/* Wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            className="w-full h-24 wave-animate"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12 fade-in">
            Hvorfor velge Trygg Sjø?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <CardTitle>360° Videoopplæring</CardTitle>
                <CardDescription>
                  Opplev realistiske situasjoner gjennom interaktive 360° videoer
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="fade-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <CardTitle>Strukturerte moduler</CardTitle>
                <CardDescription>
                  Lær i ditt eget tempo med godt organiserte kursmoduler
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="fade-in" style={{ animationDelay: "0.3s" }}>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <CardTitle>AI-assistert læring</CardTitle>
                <CardDescription>
                  Få hjelp og svar på spørsmål med vår intelligente chatbot
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 fade-in">
              Hva du lærer
            </h2>
            
            <div className="space-y-6">
              {[
                "Grunnleggende båtsikkerhet og sjøregler",
                "Redningsutstyr og nødprosedyrer",
                "Navigasjon og værforhold",
              ].map((item, index) => (
                <Card
                  key={index}
                  className="fade-in"
                  style={{ animationDelay: `${0.1 * index}s` }}
                >
                  <CardContent className="flex items-center gap-4 p-6">
                    <CheckCircle2 className="h-6 w-6 text-success flex-shrink-0" aria-hidden="true" />
                    <p className="text-lg">{item}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-ocean-gradient text-white">
        <div className="container mx-auto px-4 text-center fade-in">
          <h2 className="text-4xl font-bold mb-6">
            Klar til å bli en tryggere båtfører?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Begynn din læringsreise i dag og få tilgang til alle våre kursmoduler
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            Registrer deg nå
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Anchor className="h-5 w-5" aria-hidden="true" />
            <span className="font-bold">Trygg Sjø</span>
          </div>
          <p className="text-sm">
            © 2024 Trygg Sjø. Alle rettigheter reservert.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
