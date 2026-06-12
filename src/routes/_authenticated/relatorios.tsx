import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — AgroDecision" },
      { name: "description", content: "Relatórios semanais personalizados para sua operação." },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["relatorios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relatorios")
        .select("*")
        .order("semana", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const markOpen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("relatorios").update({ aberto: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["relatorios"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-6 w-6 text-emerald-600" /> Relatórios semanais
        </h1>
        <p className="text-sm text-muted-foreground">Acompanhe a análise consolidada da semana.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Nenhum relatório disponível ainda.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data!.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1">
                  <div className="font-medium">Semana de {new Date(r.semana).toLocaleDateString("pt-BR")}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.enviado_em ? `Enviado em ${new Date(r.enviado_em).toLocaleString("pt-BR")}` : "Não enviado"}
                  </div>
                </div>
                {r.aberto ? <Badge variant="secondary">Lido</Badge> : <Badge className="bg-emerald-600 text-white border-none">Novo</Badge>}
                {r.pdf_url ? (
                  <Button asChild variant="outline" size="sm" onClick={() => !r.aberto && markOpen.mutate(r.id)}>
                    <a href={r.pdf_url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" /> Abrir PDF
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>Sem PDF</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
