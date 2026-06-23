-- ============================================================================
-- 0010_hardening_rpc.sql
-- Hardening da superfície RPC (PostgREST) das funções SECURITY DEFINER.
-- AgroDecision · P1 (item #3 da revisao-2026-06-23.md)
--
-- ESCOPO: reduzir o que é chamável via /rest/v1/rpc/* sem QUEBRAR o RLS.
--   (1) Trigger functions  -> ninguém deve poder chamá-las pela API. REVOKE total.
--   (2) Helpers de RLS      -> revoga só de PUBLIC/anon; MANTÉM `authenticated`.
--   (3) get_coop_branding   -> intencionalmente público (portal /c/<slug>). MANTÉM.
--
-- POR QUE OS HELPERS DE RLS NÃO SÃO REVOGADOS DE `authenticated`:
--   A doc oficial do PostgreSQL (Row Security Policies) determina que a
--   expressão de uma policy roda com os privilégios do PAPEL QUE EXECUTA A
--   QUERY — não do dono da policy. Qualquer função referenciada em USING /
--   WITH CHECK exige EXECUTE para esse papel; sem isso a query falha com
--   "permission denied for function". Estes 5 helpers são referenciados nas
--   policies de cooperativas/cooperados/custos/alertas/relatorios/producoes/
--   fixacoes/chat/staff_* (migrations 0001/0002/0003/0004/0006/0007/0008),
--   avaliadas por `authenticated` em praticamente toda leitura. Revogar de
--   `authenticated` = LOCKOUT de todo o RLS. Por isso só removemos PUBLIC/anon.
--
-- Consequência esperada nos advisors: os WARNs 0028 (anon) destes 5 helpers
--   somem; os WARNs 0029 (authenticated) PERMANECEM de propósito — é o preço de
--   manter os helpers no schema `public`. Mover para schema `private` (que
--   eliminaria o 0029) é refactor maior (reescreve ~40+ policies); backlog.
--
-- Idempotência: REVOKE de privilégio inexistente é no-op. Seguro reaplicar.
-- ============================================================================

-- (1) FUNÇÕES DE GATILHO (retornam `trigger`): rodam como dono da tabela; o
--     chamador da query não precisa de EXECUTE. Nenhuma é referenciada em policy.
--     Obs.: `handle_new_user` e `touch_updated_at` já estão sem grant a
--     anon/authenticated no remoto — o REVOKE é no-op defensivo/idempotente.
revoke execute on function public.protect_cooperado_cols()    from public, anon, authenticated;
revoke execute on function public.protect_cooperativa_cols()  from public, anon, authenticated;
revoke execute on function public.protect_relatorio_cols()    from public, anon, authenticated;
revoke execute on function public.touch_updated_at()          from public, anon, authenticated;
revoke execute on function public.handle_new_user()           from public, anon, authenticated;

-- (2) HELPERS DE RLS (SECURITY DEFINER, usados em USING/WITH CHECK): revoga a
--     superfície externa (PUBLIC e anon); MANTÉM `authenticated` (senão o RLS
--     quebra). `service_role`/`postgres` não são tocados (backend/owner).
revoke execute on function public.current_cooperativa_id()                    from public, anon;
revoke execute on function public.is_coop_admin()                             from public, anon;
revoke execute on function public.is_staff()                                  from public, anon;
revoke execute on function public.is_master()                                 from public, anon;
revoke execute on function public.staff_has_permission(public.app_permission) from public, anon;

-- (3) get_coop_branding(text): intencionalmente público (portal co-branded
--     pré-login). Mantém o grant da 0005. Nada a fazer — registrado p/ deixar
--     a decisão explícita. (Continuará nos advisors como risco ACEITO.)

-- ============================================================================
-- FORA DESTA MIGRATION (passo de painel do dono):
--   Leaked Password Protection (advisor auth_leaked_password_protection):
--   Authentication -> Policies -> habilitar checagem HaveIBeenPwned.
-- ============================================================================
