import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, Plus, Trash2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const COMMODITIES = ["soja", "milho", "cafe", "algodao", "boi"] as const;

export const Route = createFileRoute("/_authenticated/custos")({
  head: () => ({
    meta: [
      { title: "Custos & Margem — AgroDecision" },
      { name: "description", content: "Cadastre seus custos por saca e acompanhe a margem em relação ao mercado." },
    ],
  }),
  component: CustosPage,
});

function CustosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const custos = useQuery({
    queryKey: ["custos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("custos_producao").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cotacoes = useQuery({
    queryKey: ["cotacoes-for-margem"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes_cache")
        .select("commodity, preco, capturado_em")
        .order("capturado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const r of data ?? []) {
        if (!map.has(r.commodity)) map.set(r.commodity, Number(r.preco));
      }
      return map;
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("custos_producao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos"] });
      toast.success("Custo removido");
    },
  });

  const precoMap = cotacoes.data ?? new Map<string, number>();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-emerald-600" /> Custos & Margem
          </h1>
          <p className="text-sm text-muted-foreground">Compare seu custo por saca com o preço de mercado.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo custo</Button>
          </DialogTrigger>
          <CustoDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      {custos.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (custos.data ?? []).length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Cadastre seu primeiro custo para ver a margem.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {custos.data!.map((c: any) => {
            const preco = precoMap.get(c.commodity);
            const custo = Number(c.custo_por_saca);
            const margem = preco != null ? preco - custo : null;
            const margemPct = preco != null && custo > 0 ? ((preco - custo) / custo) * 100 : null;
            const positivo = (margem ?? 0) >= 0;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="capitalize">{c.commodity}</span>
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Safra {c.safra}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo / saca</span>
                    <span className="font-medium">R$ {custo.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço mercado</span>
                    <span className="font-medium">{preco != null ? `R$ ${preco.toFixed(2)}` : "—"}</span>
                  </div>
                  <div className="pt-2 border-t mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Margem</span>
                      <div className={`flex items-center gap-1 font-semibold ${positivo ? "text-emerald-600" : "text-red-600"}`}>
                        {margem == null ? "—" : (
                          <>
                            {positivo ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                            R$ {margem.toFixed(2)} ({margemPct?.toFixed(1)}%)
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustoDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [commodity, setCommodity] = useState<string>("soja");
  const [safra, setSafra] = useState("2025/2026");
  const [custo, setCusto] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { error } = await supabase.from("custos_producao").insert({
        cooperado_id: u.user.id,
        commodity: commodity as any,
        safra,
        custo_por_saca: Number(custo),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["custos"] });
      toast.success("Custo cadastrado");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo custo de produção</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Commodity</Label>
          <Select value={commodity} onValueChange={setCommodity}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMMODITIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Safra</Label>
          <Input value={safra} onChange={(e) => setSafra(e.target.value)} placeholder="2025/2026" />
        </div>
        <div className="space-y-2">
          <Label>Custo por saca (R$)</Label>
          <Input type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={!custo || create.isPending}>
          {create.isPending ? "Salvando..." : "Cadastrar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
