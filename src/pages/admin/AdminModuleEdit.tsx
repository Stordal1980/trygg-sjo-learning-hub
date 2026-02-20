import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Youtube, Upload, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminModuleEdit() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = moduleId === "new";

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    content: "",
    video_url: "",
    video_type: "youtube" as "youtube" | "upload",
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
      setFormData({
        title: data.title || "",
        description: data.description || "",
        content: data.content || "",
        video_url: data.video_url || "",
        video_type: (data as any).video_type || "youtube",
        order_index: data.order_index || 0,
      });
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
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${courseId}/${moduleId || "new"}-${Date.now()}.${fileExt}`;

      // Simulate progress since Supabase JS doesn't expose upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from("course-videos")
        .upload(fileName, file, { upsert: true });

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("course-videos")
        .getPublicUrl(data.path);

      setFormData((prev) => ({ ...prev, video_url: urlData.publicUrl }));
      setUploadProgress(100);

      toast({
        title: "Lastet opp",
        description: "Videoen ble lastet opp",
      });
    } catch (error) {
      console.error("Upload error:", error);
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
      const payload = {
        title: formData.title,
        description: formData.description,
        content: formData.content,
        video_url: formData.video_url,
        video_type: formData.video_type,
        order_index: formData.order_index,
      };

      if (isNew) {
        const { error } = await supabase
          .from("course_modules")
          .insert([{ ...payload, course_id: courseId }]);

        if (error) throw error;

        toast({
          title: "Opprettet",
          description: "Modulen ble opprettet",
        });
      } else {
        const { error } = await supabase
          .from("course_modules")
          .update(payload)
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

              {/* Video type selector */}
              <div className="space-y-3">
                <Label>Videokilde</Label>
                <RadioGroup
                  value={formData.video_type}
                  onValueChange={(val: "youtube" | "upload") =>
                    setFormData({ ...formData, video_type: val, video_url: "" })
                  }
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="youtube" id="vt-youtube" />
                    <Label htmlFor="vt-youtube" className="flex items-center gap-1 cursor-pointer">
                      <Youtube className="h-4 w-4" /> YouTube URL
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="upload" id="vt-upload" />
                    <Label htmlFor="vt-upload" className="flex items-center gap-1 cursor-pointer">
                      <Upload className="h-4 w-4" /> Last opp video
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Conditional video input */}
              {formData.video_type === "youtube" ? (
                <div className="space-y-2">
                  <Label htmlFor="video_url">YouTube Video-URL</Label>
                  <div className="flex items-center gap-2">
                    <Youtube className="h-5 w-5 text-muted-foreground shrink-0" />
                    <Input
                      id="video_url"
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.video_url || ""}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Lim inn en YouTube-lenke (støtter 360° videoer)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="video_file">Last opp 360° videofil</Label>
                  <Input
                    id="video_file"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploading}
                  />
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Laster opp...
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}
                  {formData.video_url && !uploading && (
                    <p className="text-sm text-muted-foreground">
                      ✓ Video lastet opp: <span className="font-medium text-foreground">{decodeURIComponent(formData.video_url.split("/").pop() || "")}</span>
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Videoen spilles av med 360°-spilleren (Three.js)
                  </p>
                </div>
              )}

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
