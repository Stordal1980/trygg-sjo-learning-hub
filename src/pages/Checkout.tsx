import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Anchor, CheckCircle2 } from "lucide-react";

export default function Checkout() {
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-payment");

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Betalingsfeil",
        description: "Noe gikk galt. Prøv igjen.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const features = [
    "Tilgang til alle publiserte kurs",
    "360° interaktive videoer",
    "AI-drevet båtinstruktør",
    "Livstidstilgang – betal kun én gang",
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <Anchor className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Trygg Sjø</h1>
          <p className="text-muted-foreground mt-2">Få tilgang til alle kurs</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Full tilgang</CardTitle>
            <CardDescription>Livstidstilgang til hele plattformen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold">999 NOK</span>
              <p className="text-sm text-muted-foreground mt-1">Engangsbetaling</p>
            </div>

            <ul className="space-y-3">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full"
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Behandler...
                </>
              ) : (
                "Betal nå"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
