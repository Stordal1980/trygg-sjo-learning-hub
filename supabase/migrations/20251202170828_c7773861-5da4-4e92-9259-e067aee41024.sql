-- Drop the overly permissive policy that exposes all discount codes
DROP POLICY IF EXISTS "Everyone can view active discount codes by code" ON public.discount_codes;

-- Create a secure function to validate a specific discount code
-- This allows users to check a code they already have without exposing all codes
CREATE OR REPLACE FUNCTION public.validate_discount_code(code_to_check TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  discount_percent INTEGER,
  max_uses INTEGER,
  current_uses INTEGER,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    dc.id,
    dc.code,
    dc.discount_percent,
    dc.max_uses,
    dc.current_uses,
    dc.expires_at,
    dc.is_active
  FROM public.discount_codes dc
  WHERE dc.code = code_to_check
    AND dc.is_active = true
    AND (dc.expires_at IS NULL OR dc.expires_at > NOW())
    AND (dc.max_uses IS NULL OR dc.current_uses < dc.max_uses)
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_discount_code(TEXT) TO anon;