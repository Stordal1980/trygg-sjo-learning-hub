import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  video_url: string | null;
}

export default function AdminCourseEdit() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = courseId === "new";

  const [loading, setLoading] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price_nok: 0,
    is_published: false,
  });

  useEffect(() => {
    if (!isNew && courseId) {
      fetchCourse();
      fetchModules();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste kurs",
        variant: "destructive",
      });
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isNew) {
        const { data, error } = await supabase
          .from("courses")
          .insert([formData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Opprettet",
          description: "Kurset ble opprettet",
        });
        navigate(`/admin/courses/${data.id}`);
      } else {
        const { error } = await supabase
          .from("courses")
          .update(formData)
          .eq("id", courseId);

        if (error) throw error;

        toast({
          title: "Lagret",
          description: "Endringer ble lagret",
        });
      }
    } catch (error) {
      console.error("Error saving course:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre kurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Er du sikker på at du vil slette denne modulen?")) return;

    try {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;

      toast({
        title: "Slettet",
        description: "Modulen ble slettet",
      });
      fetchModules();
    } catch (error) {
      console.error("Error deleting module:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke slette modul",
        variant: "destructive",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/courses")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">
              {isNew ? "Nytt Kurs" : "Rediger Kurs"}
            </h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kursinformasjon</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tittel</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Pris (NOK)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price_nok}
                  onChange={(e) => setFormData({ ...formData, price_nok: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="published"
                  checked={formData.is_published}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
                />
                <Label htmlFor="published">Publisert</Label>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? "Lagrer..." : "Lagre"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {!isNew && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Moduler</CardTitle>
              <Button onClick={() => navigate(`/admin/courses/${courseId}/modules/new`)}>
                <Plus className="mr-2 h-4 w-4" />
                Ny Modul
              </Button>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Ingen moduler ennå. Opprett den første modulen.
                </p>
              ) : (
                <div className="space-y-2">
                  {modules.map((module) => (
                    <div
                      key={module.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-medium">{module.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {module.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/courses/${courseId}/modules/${module.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteModule(module.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
