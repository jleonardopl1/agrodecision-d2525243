import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sinais")({
  head: () => ({
    meta: [
      { title: "Sinais de IA — AgroDecision" },
      { name: "description", content: "Recomendações de compra, venda ou manter geradas por IA para suas commodities." },
    ],
  }),
  component: SinaisPage,
});

function sinalColor(sinal: string) {
  const s = sinal.toLowerCase();
  if (s.includes("compr")) return "bg-emerald-600";
  if (s.includes("vend")) return "bg-red-600";
  return "bg-amber-500";
}

function SinaisPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["sinais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sinais_ia")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-emerald-600" />
          Sinais de IA
        </h1>
        <p className="text-sm text-muted-foreground">Recomendações automáticas baseadas em cotações e tendências.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (data ?? []).length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nenhum sinal disponível no momento. Volte em breve.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data!.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="capitalize font-semibold">{s.commodity}</span>
                  <Badge className={`${sinalColor(s.sinal)} text-white border-none`}>{s.sinal}</Badge>
                </div>
                <p className="text-sm text-foreground/90">{s.recomendacao}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Confiança: {s.confianca != null ? `${Math.round(Number(s.confianca) * 100)}%` : "—"}</span>
                  <span>{s.created_at ? new Date(s.created_at).toLocaleString("pt-BR") : ""}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
