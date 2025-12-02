-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Update courses table policies for admin access
CREATE POLICY "Admins can insert courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update courses"
  ON public.courses
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete courses"
  ON public.courses
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all courses"
  ON public.courses
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update course_modules table policies for admin access
CREATE POLICY "Admins can insert modules"
  ON public.course_modules
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modules"
  ON public.course_modules
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete modules"
  ON public.course_modules
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all modules"
  ON public.course_modules
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for course videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-videos', 'course-videos', true);

-- Storage policies for videos
CREATE POLICY "Admins can upload videos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'course-videos' AND
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Anyone can view videos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'course-videos');

CREATE POLICY "Admins can delete videos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'course-videos' AND
    public.has_role(auth.uid(), 'admin')
  );