import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminPricing() {
  const [loading, setLoading] = useState(true);
  const [bundlePrice, setBundlePrice] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bundleRes, coursesRes] = await Promise.all([
        supabase.from("bundle_pricing").select("*").eq("is_active", true).maybeSingle(),
        supabase.from("courses").select("*").order("created_at", { ascending: false }),
      ]);

      if (bundleRes.data) setBundlePrice(bundleRes.data);
      if (coursesRes.data) setCourses(coursesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateCoursePrice = async (courseId: string, price: number) => {
    try {
      const { error } = await supabase
        .from("courses")
        .update({ price_nok: price })
        .eq("id", courseId);

      if (error) throw error;

      toast({
        title: "Pris oppdatert",
        description: "Kursprisen er oppdatert",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere pris",
        variant: "destructive",
      });
    }
  };

  const saveBundlePrice = async (formData: FormData) => {
    try {
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const price = parseInt(formData.get("price") as string);

      if (bundlePrice) {
        const { error } = await supabase
          .from("bundle_pricing")
          .update({ name, description, price_nok: price })
          .eq("id", bundlePrice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("bundle_pricing")
          .insert({ name, description, price_nok: price, is_active: true });
        if (error) throw error;
      }

      toast({
        title: "Bundlepris lagret",
        description: "Bundleprisen er oppdatert",
      });
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke lagre bundlepris",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Prisstyrring</h1>
          <p className="text-muted-foreground">
            Administrer priser for kurs og bundle
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bundle-pris</CardTitle>
                <CardDescription>
                  Tilgang til alle kurs samlet
                </CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    {bundlePrice ? "Rediger" : <><Plus className="h-4 w-4 mr-2" /> Opprett</>}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bundle-pris</DialogTitle>
                    <DialogDescription>
                      Sett pris for tilgang til alle kurs
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveBundlePrice(new FormData(e.currentTarget));
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="name">Navn</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={bundlePrice?.name || "Alle kurs"}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Beskrivelse</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={bundlePrice?.description || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Pris (NOK)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        defaultValue={bundlePrice?.price_nok || 0}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Lagre
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          {bundlePrice && (
            <CardContent>
              <p className="text-2xl font-bold">{bundlePrice.price_nok} NOK</p>
              <p className="text-sm text-muted-foreground">{bundlePrice.description}</p>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Individuelle kurspriser</CardTitle>
            <CardDescription>
              Sett pris per kurs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="font-medium">{course.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-32"
                      defaultValue={course.price_nok}
                      onBlur={(e) => {
                        const newPrice = parseInt(e.target.value);
                        if (newPrice !== course.price_nok) {
                          updateCoursePrice(course.id, newPrice);
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">NOK</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
