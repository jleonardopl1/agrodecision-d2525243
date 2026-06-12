-- 1. Privilege escalation on signup: force role and plano defaults on INSERT
DROP POLICY IF EXISTS "cooperado: inserir proprio" ON public.cooperados;
CREATE POLICY "cooperado: inserir proprio"
ON public.cooperados
FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
  AND role = 'cooperado'
  AND plano = 'free'
  AND stripe_subscription_id IS NULL
);

-- Also prevent users from escalating their own role/plan via UPDATE
DROP POLICY IF EXISTS "cooperado: atualizar proprio" ON public.cooperados;
CREATE POLICY "cooperado: atualizar proprio"
ON public.cooperados
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND role = (SELECT role FROM public.cooperados WHERE id = auth.uid())
  AND plano = (SELECT plano FROM public.cooperados WHERE id = auth.uid())
  AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT stripe_subscription_id FROM public.cooperados WHERE id = auth.uid())
);

-- 2. Restrict cooperados SELECT: only own row, or coop admin sees all in their coop
DROP POLICY IF EXISTS "cooperado: ler mesma coop" ON public.cooperados;

CREATE POLICY "cooperado: ler proprio"
ON public.cooperados
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "cooperado: admin le todos da coop"
ON public.cooperados
FOR SELECT
TO authenticated
USING (
  cooperativa_id = public.current_cooperativa_id()
  AND public.is_coop_admin()
);

-- 3. Hide Stripe IDs on cooperativas from regular members (column-level)
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.cooperativas FROM authenticated;
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.cooperativas FROM anon;
-- service_role keeps full access by default; explicit grant for clarity
GRANT SELECT ON public.cooperativas TO service_role;

-- 4. Lock down revenue_share_events: deny all writes from app roles
CREATE POLICY "revshare: nenhum insert do app"
ON public.revenue_share_events
AS RESTRICTIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "revshare: nenhum update do app"
ON public.revenue_share_events
AS RESTRICTIVE
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "revshare: nenhum delete do app"
ON public.revenue_share_events
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);

-- 5. Set immutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 6. Revoke EXECUTE on trigger-only functions from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- get_coop_branding is intentionally callable by anon (used by signup/landing)
-- but revoke from PUBLIC and explicitly grant only to anon + authenticated
REVOKE EXECUTE ON FUNCTION public.get_coop_branding(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_coop_branding(text) TO anon, authenticated;

-- current_cooperativa_id and is_coop_admin are used inside RLS policies, so
-- authenticated must keep EXECUTE for policy evaluation. Just lock down anon.
REVOKE EXECUTE ON FUNCTION public.current_cooperativa_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_cooperativa_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_coop_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_coop_admin() TO authenticated;