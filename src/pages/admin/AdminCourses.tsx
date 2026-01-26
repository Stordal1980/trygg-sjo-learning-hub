import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price_nok: number;
  is_published: boolean;
  thumbnail_url: string | null;
}

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [hasRelatedData, setHasRelatedData] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke laste kurs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkRelatedData = async (courseId: string): Promise<boolean> => {
    const { count: paymentsCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);

    const { count: enrollmentsCount } = await supabase
      .from("user_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);

    return (paymentsCount || 0) > 0 || (enrollmentsCount || 0) > 0;
  };

  const handleDeleteClick = async (course: Course) => {
    setCourseToDelete(course);
    const hasData = await checkRelatedData(course.id);
    setHasRelatedData(hasData);
    setDeleteDialogOpen(true);
  };

  const handleUnpublish = async () => {
    if (!courseToDelete) return;

    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_published: false })
        .eq("id", courseToDelete.id);

      if (error) throw error;

      toast({
        title: "Avpublisert",
        description: "Kurset er nå avpublisert og skjult for brukere",
      });
      fetchCourses();
    } catch (error) {
      console.error("Error unpublishing course:", error);
      toast({
        title: "Feil",
        description: "Kunne ikke avpublisere kurs",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;

    try {
      // First delete related modules
      await supabase
        .from("course_modules")
        .delete()
        .eq("course_id", courseToDelete.id);

      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseToDelete.id);

      if (error) throw error;

      toast({
        title: "Slettet",
        description: "Kurset ble slettet",
      });
      fetchCourses();
    } catch (error: any) {
      console.error("Error deleting course:", error);
      
      if (error.code === "23503") {
        toast({
          title: "Kan ikke slette",
          description: "Kurset har tilknyttede betalinger eller påmeldinger. Avpubliser kurset i stedet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Feil",
          description: "Kunne ikke slette kurs",
          variant: "destructive",
        });
      }
    } finally {
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Kurs</h2>
            <p className="text-muted-foreground">Administrer alle kurs</p>
          </div>
          <Button onClick={() => navigate("/admin/courses/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nytt Kurs
          </Button>
        </div>

        {loading ? (
          <p>Laster...</p>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ingen kurs opprettet ennå</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <Badge variant={course.is_published ? "default" : "secondary"}>
                      {course.is_published ? "Publisert" : "Utkast"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{course.price_nok} NOK</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/courses/${course.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(course)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hasRelatedData ? "Kurset har tilknyttede data" : "Slett kurs"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasRelatedData ? (
                <>
                  Dette kurset har betalinger eller påmeldinger knyttet til seg og kan ikke slettes permanent.
                  Du kan avpublisere kurset slik at det ikke lenger er synlig for brukere.
                </>
              ) : (
                <>
                  Er du sikker på at du vil slette "{courseToDelete?.title}"? 
                  Denne handlingen kan ikke angres.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            {hasRelatedData ? (
              <AlertDialogAction onClick={handleUnpublish}>
                <EyeOff className="mr-2 h-4 w-4" />
                Avpubliser
              </AlertDialogAction>
            ) : (
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Slett permanent
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
