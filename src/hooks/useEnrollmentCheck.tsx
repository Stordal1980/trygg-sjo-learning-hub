import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useEnrollmentCheck = (courseId?: string) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!courseId) {
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        // Sjekk om brukeren har noen enrollments i det hele tatt
        const { data, error } = await supabase
          .from("user_enrollments")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        if (error) throw error;
        setHasAccess((data?.length || 0) > 0);
      } catch (error) {
        console.error("Error checking enrollment:", error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkEnrollment();
  }, [courseId]);

  return { hasAccess, loading };
};
