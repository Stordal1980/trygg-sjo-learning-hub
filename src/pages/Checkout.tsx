import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");
  const isBundle = searchParams.get("bundle") === "true";
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [courseName, setCourseName] = useState<string>("");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPriceInfo();
  }, [courseId, isBundle]);

  useEffect(() => {
    setFinalPrice(Math.max(0, price - (price * discount / 100)));
  }, [price, discount]);

  const fetchPriceInfo = async () => {
    try {
      if (isBundle) {
        const { data, error } = await supabase
          .from("bundle_pricing")
          .select("*")
          .eq("is_active", true)
          .single();
        
        if (error) throw error;
        setPrice(data.price_nok);
        setCourseName(data.name);
      } else if (courseId) {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();
        
        if (error) throw error;
        setPrice(data.price_nok);
        setCourseName(data.title);
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke hente prisinformasjon",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .eq("code", discountCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast({
          title: "Ugyldig rabattkode",
          description: "Rabattkoden finnes ikke eller er utløpt",
          variant: "destructive",
        });
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({
          title: "Utløpt rabattkode",
          description: "Denne rabattkoden har utløpt",
          variant: "destructive",
        });
        return;
      }

      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({
          title: "Rabattkode brukt opp",
          description: "Denne rabattkoden har nådd maksimalt antall bruk",
          variant: "destructive",
        });
        return;
      }

      setDiscount(data.discount_percent);
      toast({
        title: "Rabattkode aktivert!",
        description: `${data.discount_percent}% rabatt`,
      });
    } catch (error) {
      console.error("Error applying discount:", error);
    }
  };

  const processPayment = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Ikke innlogget");

      // Dummy betaling - simpler bare en vellykket betaling
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          amount_nok: price,
          discount_amount_nok: price - finalPrice,
          final_amount_nok: finalPrice,
          payment_method: "dummy",
          status: "completed",
          course_id: isBundle ? null : courseId,
          is_bundle: isBundle,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Legg til enrollment(s)
      if (isBundle) {
        // Gi tilgang til alle publiserte kurs
        const { data: courses } = await supabase
          .from("courses")
          .select("id")
          .eq("is_published", true);

        if (courses) {
          const enrollments = courses.map(course => ({
            user_id: user.id,
            course_id: course.id,
          }));
          
          await supabase.from("user_enrollments").insert(enrollments);
        }
      } else if (courseId) {
        await supabase.from("user_enrollments").insert({
          user_id: user.id,
          course_id: courseId,
        });
      }

      toast({
        title: "Betaling vellykket!",
        description: "Du har nå tilgang til kurset/kursene",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Betalingsfeil",
        description: "Noe gikk galt under betalingen",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Kasse</CardTitle>
            <CardDescription>
              Fullfør betalingen for å få tilgang
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">{courseName}</h3>
              <p className="text-2xl font-bold">{price} NOK</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Rabattkode (valgfritt)</Label>
              <div className="flex gap-2">
                <Input
                  id="discount"
                  placeholder="Skriv inn rabattkode"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                />
                <Button onClick={applyDiscountCode} variant="outline">
                  Bruk
                </Button>
              </div>
            </div>

            {discount > 0 && (
              <div className="bg-muted p-4 rounded-lg space-y-1">
                <p className="text-sm">Rabatt ({discount}%): -{price - finalPrice} NOK</p>
                <p className="text-lg font-bold">Totalt: {finalPrice} NOK</p>
              </div>
            )}

            <div className="border-t pt-6">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Test-modus:</strong> Dette er en simulert betaling. 
                  Trykk på "Fullfør betaling" for å få umiddelbar tilgang.
                </p>
              </div>
              
              <Button 
                onClick={processPayment} 
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
                  "Fullfør betaling (TEST)"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
