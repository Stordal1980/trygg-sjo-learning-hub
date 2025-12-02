import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Anchor, ArrowLeft, Play, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Video360Player } from "@/components/Video360Player";

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

const CourseDetail = () => {
  const { courseId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId || !user) return;

      try {
        // Fetch course details
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .eq("is_published", true)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch modules
        const { data: modulesData, error: modulesError } = await supabase
          .from("course_modules")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (modulesError) throw modulesError;
        setModules(modulesData || []);
      } catch (error: any) {
        toast({
          title: "Feil ved lasting av kurs",
          description: error.message,
          variant: "destructive",
        });
        navigate("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId, user, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Anchor className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">Laster kurs...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Tilbake
          </Button>
          <div className="flex items-center gap-2">
            <Anchor className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-bold">Trygg Sjø</h1>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 fade-in">
          <h2 className="text-4xl font-bold mb-4">{course.title}</h2>
          {course.description && (
            <p className="text-lg text-muted-foreground">{course.description}</p>
          )}
        </div>

        <section className="fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="text-2xl font-bold mb-6">Kursmoduler</h3>
          {modules.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <p className="text-muted-foreground">
                  Ingen moduler tilgjengelig ennå
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {modules.map((module, index) => (
                <Card
                  key={module.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                            {index + 1}
                          </span>
                          {module.title}
                        </CardTitle>
                        {module.description && (
                          <CardDescription>{module.description}</CardDescription>
                        )}
                      </div>
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {module.video_url ? (
                      <Video360Player videoUrl={module.video_url} />
                    ) : (
                      <div className="bg-muted rounded-lg p-8 text-center">
                        <Play className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                        <p className="text-sm text-muted-foreground italic">
                          Videoinnhold kommer snart
                        </p>
                      </div>
                    )}
                    {module.content && (
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-muted-foreground">{module.content}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default CourseDetail;
