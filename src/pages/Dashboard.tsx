import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Anchor, BookOpen, LogOut, Award, Menu, Settings } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { BoatInstructorChat } from "@/components/BoatInstructorChat";

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
}

interface Enrollment {
  course_id: string;
  enrolled_at: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch published courses
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select("*")
          .eq("is_published", true)
          .order("created_at", { ascending: false });

        if (coursesError) throw coursesError;
        setCourses(coursesData || []);

        // Fetch user enrollments
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from("user_enrollments")
          .select("course_id, enrolled_at")
          .eq("user_id", user.id);

        if (enrollmentsError) throw enrollmentsError;
        setEnrollments(enrollmentsData || []);

        // Check if user is admin
        const { data: rolesData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();

        setIsAdmin(!!rolesData);
      } catch (error: any) {
        toast({
          title: "Feil ved lasting av data",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some((e) => e.course_id === courseId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Anchor className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anchor className="h-6 w-6 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-bold">Trygg Sjø</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="bg-card z-50">
                  <div className="flex flex-col gap-4 mt-8">
                    <h2 className="text-lg font-bold mb-4">Administrator</h2>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate("/admin")}
                    >
                      <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                      Admin-panel
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
              Logg ut
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 fade-in">
          <h2 className="text-3xl font-bold mb-2">
            Velkommen, {user?.user_metadata?.full_name || "bruker"}!
          </h2>
          <p className="text-muted-foreground">
            Fortsett læringen din eller utforsk nye kurs
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-12 fade-in" style={{ animationDelay: "0.1s" }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mine kurs</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground">
                Totalt antall påmeldte kurs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fremgang</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0%</div>
              <Progress value={0} className="mt-2" aria-label="Kursfremgang" />
            </CardContent>
          </Card>

          <Card className="bg-accent text-accent-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tilgjengelige kurs</CardTitle>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{courses.length}</div>
              <p className="text-xs opacity-90">
                Klar for å utforske
              </p>
            </CardContent>
          </Card>
        </div>

        <section className="fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-2xl font-bold mb-6">Tilgjengelige kurs</h3>
          {courses.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                <p className="text-muted-foreground">
                  Ingen kurs tilgjengelig for øyeblikket
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <Card key={course.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant={isEnrolled(course.id) ? "secondary" : "default"}
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      {isEnrolled(course.id) ? "Fortsett kurs" : "Se kurs"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="fade-in mt-8" style={{ animationDelay: "0.3s" }}>
          <BoatInstructorChat />
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
