-- ==============================================================================
-- VANTAIRE EYEWEAR v1.3 — PHASE 11
-- Site Settings Management & Singleton Integrity Hardening
-- ==============================================================================

-- 1. SINGLETON LIFECYCLE HARDENING: REVOKE DIRECT INSERT & DELETE
-- ------------------------------------------------------------------------------
-- Drop obsolete Owner INSERT and DELETE policies from Phase 2
DROP POLICY IF EXISTS "site_settings_insert_owner" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_delete_owner" ON public.site_settings;

-- Revoke table-level INSERT and DELETE privileges to guarantee singleton preservation
REVOKE INSERT ON public.site_settings FROM authenticated, anon, PUBLIC;
REVOKE DELETE ON public.site_settings FROM authenticated, anon, PUBLIC;

-- Explicitly configure SELECT and UPDATE privileges
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;

-- Ensure UPDATE RLS policy is locked to authenticated Admins/Owners and id = 1
DROP POLICY IF EXISTS "site_settings_update_admin" ON public.site_settings;
CREATE POLICY "site_settings_update_admin" ON public.site_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin() AND id = 1);


-- 2. IMMUTABILITY TRIGGER: ID AND CREATED_AT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_guard_site_settings_immutable()
RETURNS trigger AS $$
BEGIN
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'Site settings singleton ID cannot be modified (must remain 1)'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Site settings created_at timestamp is immutable'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_site_settings_immutable ON public.site_settings;
CREATE TRIGGER trg_guard_site_settings_immutable
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_site_settings_immutable();

-- Prevent deletion of singleton row
CREATE OR REPLACE FUNCTION public.fn_guard_site_settings_no_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Site settings singleton row cannot be deleted'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = '';

DROP TRIGGER IF EXISTS trg_guard_site_settings_no_delete ON public.site_settings;
CREATE TRIGGER trg_guard_site_settings_no_delete
  BEFORE DELETE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_site_settings_no_delete();


-- 3. DOMAIN & OPERATIONAL DATA INTEGRITY CHECK CONSTRAINTS
-- ------------------------------------------------------------------------------

-- WhatsApp number format: digits only, 8 to 15 digits, non-zero start
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_whatsapp_number_format;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_whatsapp_number_format
  CHECK (whatsapp_number ~ '^[1-9][0-9]{7,14}$');

-- WhatsApp display number consistency: digits extracted from display number must equal whatsapp_number
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_display_number_match;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_display_number_match
  CHECK (regexp_replace(whatsapp_display_number, '[^0-9]', '', 'g') = whatsapp_number);

-- Demo truthfulness: If demo mode is disabled (is_demo = false), number cannot be the known placeholder
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_demo_truthfulness;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_demo_truthfulness
  CHECK (
    whatsapp_is_demo = true OR
    (whatsapp_number <> '8801700000000' AND regexp_replace(whatsapp_display_number, '[^0-9]', '', 'g') <> '8801700000000')
  );

-- Nonblank contact phone & hours
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_contact_nonblank;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_contact_nonblank
  CHECK (
    length(trim(contact_phone)) > 0 AND
    length(trim(contact_hours)) > 0 AND
    length(trim(contact_friday_hours)) > 0 AND
    length(trim(contact_location)) > 0 AND
    length(trim(contact_service_area)) > 0
  );

-- Contact email format validation
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_contact_email;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_contact_email
  CHECK (
    length(trim(contact_email)) > 0 AND
    contact_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- Nonblank greeting, delivery times, note, and packaging
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_delivery_strings;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_delivery_strings
  CHECK (
    length(trim(whatsapp_default_greeting)) > 0 AND
    length(trim(delivery_inside_dhaka_time)) > 0 AND
    length(trim(delivery_outside_dhaka_time)) > 0 AND
    length(trim(delivery_advance_payment_note)) > 0 AND
    length(trim(delivery_packaging)) > 0
  );

-- Currency invariants (must remain BDT and ৳)
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_currency_invariants;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_currency_invariants
  CHECK (
    delivery_currency_code = 'BDT' AND
    delivery_currency_symbol = '৳'
  );

-- Social URLs validation: empty string or NULL allowed; if present, must be HTTPS from official Meta domains
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS chk_site_settings_social_urls;
ALTER TABLE public.site_settings
  ADD CONSTRAINT chk_site_settings_social_urls
  CHECK (
    (social_instagram IS NULL OR social_instagram = '' OR social_instagram ~ '^https://(www\.)?instagram\.com/') AND
    (social_facebook IS NULL OR social_facebook = '' OR social_facebook ~ '^https://(www\.|m\.)?facebook\.com/')
  );
