import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminDiscounts() {
  const [loading, setLoading] = useState(true);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const fetchDiscountCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDiscountCodes(data || []);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const createDiscountCode = async (formData: FormData) => {
    try {
      const code = (formData.get("code") as string).toUpperCase();
      const discount_percent = parseInt(formData.get("discount_percent") as string);
      const max_uses = formData.get("max_uses") ? parseInt(formData.get("max_uses") as string) : null;
      const expires_at = formData.get("expires_at") ? new Date(formData.get("expires_at") as string).toISOString() : null;

      const { error } = await supabase
        .from("discount_codes")
        .insert({
          code,
          discount_percent,
          max_uses,
          expires_at,
          is_active: true,
        });

      if (error) throw error;

      toast({
        title: "Rabattkode opprettet",
        description: `Kode "${code}" er opprettet`,
      });
      setDialogOpen(false);
      fetchDiscountCodes();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke opprette rabattkode",
        variant: "destructive",
      });
    }
  };

  const toggleCodeStatus = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
      fetchDiscountCodes();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere status",
        variant: "destructive",
      });
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm("Er du sikker på at du vil slette denne rabattkoden?")) return;

    try {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Rabattkode slettet",
        description: "Rabattkoden er slettet",
      });
      fetchDiscountCodes();
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke slette rabattkode",
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rabattkoder</h1>
            <p className="text-muted-foreground">
              Administrer rabattkoder for kurs
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Ny rabattkode
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Opprett rabattkode</DialogTitle>
                <DialogDescription>
                  Lag en ny rabattkode for brukere
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createDiscountCode(new FormData(e.currentTarget));
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="code">Kode</Label>
                  <Input
                    id="code"
                    name="code"
                    placeholder="SOMMER2024"
                    required
                    className="uppercase"
                  />
                </div>
                <div>
                  <Label htmlFor="discount_percent">Rabatt (%)</Label>
                  <Input
                    id="discount_percent"
                    name="discount_percent"
                    type="number"
                    min="1"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="max_uses">Maks antall bruk (valgfritt)</Label>
                  <Input
                    id="max_uses"
                    name="max_uses"
                    type="number"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="expires_at">Utløpsdato (valgfritt)</Label>
                  <Input
                    id="expires_at"
                    name="expires_at"
                    type="datetime-local"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Opprett rabattkode
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aktive rabattkoder</CardTitle>
            <CardDescription>
              Oversikt over alle rabattkoder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Rabatt</TableHead>
                  <TableHead>Brukt</TableHead>
                  <TableHead>Utløper</TableHead>
                  <TableHead>Aktiv</TableHead>
                  <TableHead>Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountCodes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-mono font-bold">{code.code}</TableCell>
                    <TableCell>{code.discount_percent}%</TableCell>
                    <TableCell>
                      {code.current_uses}
                      {code.max_uses && ` / ${code.max_uses}`}
                    </TableCell>
                    <TableCell>
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : "Aldri"}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={code.is_active}
                        onCheckedChange={() => toggleCodeStatus(code.id, code.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCode(code.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {discountCodes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Ingen rabattkoder opprettet ennå
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
