
-- Exam available slots (admin creates these)
CREATE TABLE public.exam_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  max_bookings integer NOT NULL DEFAULT 1,
  current_bookings integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exam bookings (users book these)
CREATE TABLE public.exam_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.exam_slots(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_id)
);

-- RLS for exam_slots
ALTER TABLE public.exam_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam slots"
  ON public.exam_slots FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active exam slots"
  ON public.exam_slots FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS for exam_bookings
ALTER TABLE public.exam_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own bookings"
  ON public.exam_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own bookings"
  ON public.exam_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all bookings"
  ON public.exam_bookings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER handle_exam_slots_updated_at
  BEFORE UPDATE ON public.exam_slots
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_exam_bookings_updated_at
  BEFORE UPDATE ON public.exam_bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
