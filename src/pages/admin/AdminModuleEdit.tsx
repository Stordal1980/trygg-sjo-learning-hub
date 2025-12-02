import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload } from "lucide-react";

export default function AdminModuleEdit() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = moduleId === "new";

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    video_url: "",
    order_index: 0,
  });

  useEffect(() => {
    if (!isNew && moduleId) {
      fetchModule();
    }
  }, [moduleId]);

  const fetchModule = async () => {
    try {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*")
        .eq("id", moduleId)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error("Error fetching module:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste modul",
        variant: "destructive",
      });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${courseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-videos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("course-videos")
        .getPublicUrl(filePath);

      setFormData({ ...formData, video_url: publicUrl });

      toast({
        title: "Lastet opp",
        description: "Video ble lastet opp",
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste opp video",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isNew) {
        const { error } = await supabase
          .from("course_modules")
          .insert([{ ...formData, course_id: courseId }]);

        if (error) throw error;

        toast({
          title: "Opprettet",
          description: "Modulen ble opprettet",
        });
      } else {
        const { error } = await supabase
          .from("course_modules")
          .update(formData)
          .eq("id", moduleId);

        if (error) throw error;

        toast({
          title: "Lagret",
          description: "Endringer ble lagret",
        });
      }

      navigate(`/admin/courses/${courseId}`);
    } catch (error) {
      console.error("Error saving module:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke lagre modul",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/courses/${courseId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">
              {isNew ? "Ny Modul" : "Rediger Modul"}
            </h2>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Modulinformasjon</CardTitle>
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
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Innhold</Label>
                <Textarea
                  id="content"
                  value={formData.content || ""}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  placeholder="Markdown støttes..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Rekkefølge</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video">360° Video</Label>
                <div className="flex gap-2">
                  <Input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploading}
                    className="flex-1"
                  />
                  {uploading && <span className="text-sm text-muted-foreground">Laster opp...</span>}
                </div>
                {formData.video_url && (
                  <p className="text-sm text-muted-foreground">
                    Video lastet opp ✓
                  </p>
                )}
              </div>

              <Button type="submit" disabled={loading || uploading}>
                {loading ? "Lagrer..." : "Lagre"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
