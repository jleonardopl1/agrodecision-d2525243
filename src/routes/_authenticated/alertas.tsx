import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const COMMODITIES = ["soja", "milho", "cafe", "algodao", "boi"] as const;
const PARES = ["USD/BRL", "EUR/BRL", "CNY/BRL"] as const;

export const Route = createFileRoute("/_authenticated/alertas")({
  head: () => ({
    meta: [
      { title: "Alertas — AgroDecision" },
      { name: "description", content: "Gerencie alertas de preço para commodities e câmbio." },
    ],
  }),
  component: AlertasPage,
});

function AlertasPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["alertas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alertas").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const toggle = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("alertas").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alertas"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alertas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertas"] });
      toast.success("Alerta removido");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-emerald-600" /> Alertas
          </h1>
          <p className="text-sm text-muted-foreground">Receba notificações quando preços atingirem suas metas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo alerta</Button>
          </DialogTrigger>
          <AlertaDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (data ?? []).length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">Você ainda não criou nenhum alerta.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {data!.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">{a.tipo}</Badge>
                    <span className="font-medium capitalize">{a.commodity ?? a.par_cambio}</span>
                    <span className="text-sm text-muted-foreground">
                      quando preço {a.operador} {a.valor_alvo}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Canais: {a.canais?.join(", ") || "—"}
                    {a.ultimo_disparo && ` • Último disparo: ${new Date(a.ultimo_disparo).toLocaleString("pt-BR")}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={a.ativo} onCheckedChange={(v) => toggle.mutate({ id: a.id, ativo: v })} />
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertaDialog({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"preco" | "cambio">("preco");
  const [commodity, setCommodity] = useState<string>("soja");
  const [par, setPar] = useState<string>("USD/BRL");
  const [operador, setOperador] = useState<">=" | "<=">(">=");
  const [valor, setValor] = useState("");
  const [canais, setCanais] = useState<string[]>(["email"]);

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const payload: any = {
        cooperado_id: u.user.id,
        tipo,
        operador,
        valor_alvo: Number(valor),
        canais,
        ativo: true,
      };
      if (tipo === "preco") payload.commodity = commodity;
      else payload.par_cambio = par;
      const { error } = await supabase.from("alertas").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alertas"] });
      toast.success("Alerta criado");
      onDone();
    },
    onError: (e: any) => toast.error(e.message),
  });

  function toggleCanal(c: string) {
    setCanais((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Novo alerta</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="preco">Preço de commodity</SelectItem>
              <SelectItem value="cambio">Câmbio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tipo === "preco" ? (
          <div className="space-y-2">
            <Label>Commodity</Label>
            <Select value={commodity} onValueChange={setCommodity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMMODITIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Par</Label>
            <Select value={par} onValueChange={setPar}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Operador</Label>
            <Select value={operador} onValueChange={(v) => setOperador(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value=">=">≥ maior ou igual</SelectItem>
                <SelectItem value="<=">≤ menor ou igual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor alvo</Label>
            <Input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Canais</Label>
          <div className="flex gap-3">
            {["email", "push"].map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                <Checkbox checked={canais.includes(c)} onCheckedChange={() => toggleCanal(c)} />
                {c}
              </label>
            ))}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => create.mutate()} disabled={!valor || create.isPending}>
          {create.isPending ? "Salvando..." : "Criar alerta"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
