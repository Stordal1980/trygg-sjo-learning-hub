import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const verify = async () => {
      if (!sessionId) {
        setVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });

        if (error) throw error;
        setSuccess(data?.success === true);
      } catch (err) {
        console.error("Verification error:", err);
      } finally {
        setVerifying(false);
      }
    };

    verify();
  }, [sessionId]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          {success ? (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle>Betaling vellykket!</CardTitle>
            </>
          ) : (
            <CardTitle>Noe gikk galt</CardTitle>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {success
              ? "Du har nå tilgang til alle kurs. Velkommen ombord!"
              : "Betalingen kunne ikke verifiseres. Kontakt oss om problemet vedvarer."}
          </p>
          <Button onClick={() => navigate("/dashboard")} className="w-full">
            Gå til mine kurs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
