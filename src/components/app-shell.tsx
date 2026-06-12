import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Brain, Bell, FileText, Calculator, LogOut, Sprout, Menu } from "lucide-react";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Cotações", icon: LayoutDashboard },
  { to: "/sinais", label: "Sinais IA", icon: Brain },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/relatorios", label: "Relatórios", icon: FileText },
  { to: "/custos", label: "Custos & Margem", icon: Calculator },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;
      const { data: coop } = await supabase
        .from("cooperados")
        .select("id, nome, email, cooperativa_id, cooperativas:cooperativa_id(nome, slug, logo_url, cor_primaria, cor_secundaria)")
        .eq("id", userData.user.id)
        .maybeSingle();
      return coop;
    },
  });

  // Apply branding as CSS vars
  useEffect(() => {
    const coop = (me as any)?.cooperativas;
    if (coop?.cor_primaria) {
      document.documentElement.style.setProperty("--brand-primary", coop.cor_primaria);
    }
    if (coop?.cor_secundaria) {
      document.documentElement.style.setProperty("--brand-secondary", coop.cor_secundaria);
    }
  }, [me]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const coopNome = (me as any)?.cooperativas?.nome ?? "AgroDecision";
  const coopLogo = (me as any)?.cooperativas?.logo_url as string | undefined;

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <SidebarContent coopNome={coopNome} coopLogo={coopLogo} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="relative w-64 bg-card border-r flex flex-col" onClick={(e) => e.stopPropagation()}>
            <SidebarContent coopNome={coopNome} coopLogo={coopLogo} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-card flex items-center justify-between px-4 md:px-6 gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0 truncate">
            <span className="text-sm text-muted-foreground">Olá, </span>
            <span className="text-sm font-medium">{(me as any)?.nome ?? "cooperado"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ coopNome, coopLogo, onNavigate }: { coopNome: string; coopLogo?: string; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <>
      <div className="h-14 border-b flex items-center gap-2 px-4">
        {coopLogo ? (
          <img src={coopLogo} alt={coopNome} className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-600 text-white">
            <Sprout className="h-4 w-4" />
          </div>
        )}
        <span className="font-semibold truncate">{coopNome}</span>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-emerald-600 text-white" : "hover:bg-accent text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 text-xs text-muted-foreground border-t">AgroDecision SaaS</div>
    </>
  );
}
