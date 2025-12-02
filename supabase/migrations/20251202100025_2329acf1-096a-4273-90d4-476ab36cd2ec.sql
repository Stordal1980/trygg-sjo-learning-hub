-- Tabell for samlet prising (bundle)
CREATE TABLE IF NOT EXISTS public.bundle_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_nok INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabell for rabattkoder
CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabell for betalinger (forberedt for Stripe)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_nok INTEGER NOT NULL,
  discount_code_id UUID REFERENCES discount_codes(id),
  discount_amount_nok INTEGER DEFAULT 0,
  final_amount_nok INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'dummy', -- 'stripe' eller 'dummy'
  stripe_payment_id TEXT, -- For Stripe senere
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  course_id UUID REFERENCES courses(id), -- NULL hvis bundle
  is_bundle BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Oppdater user_enrollments for å tillate admin å legge til enrollments
ALTER TABLE public.user_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert enrollments after payment" ON public.user_enrollments;
CREATE POLICY "Users can insert enrollments after payment"
ON public.user_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- RLS for bundle_pricing
ALTER TABLE public.bundle_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active bundle pricing"
ON public.bundle_pricing
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage bundle pricing"
ON public.bundle_pricing
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for discount_codes
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active discount codes by code"
ON public.discount_codes
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at på nye tabeller
CREATE TRIGGER update_bundle_pricing_updated_at
BEFORE UPDATE ON public.bundle_pricing
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();