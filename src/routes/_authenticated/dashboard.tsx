import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from "lucide-react";

const COMMODITIES = ["soja", "milho", "cafe", "algodao", "boi"] as const;
type Commodity = (typeof COMMODITIES)[number];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Cotações & Câmbio — AgroDecision" },
      { name: "description", content: "Acompanhe em tempo real as cotações das principais commodities e câmbio." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [selected, setSelected] = useState<Commodity>("soja");

  const cotacoes = useQuery({
    queryKey: ["cotacoes-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes_cache")
        .select("*")
        .order("capturado_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const cambio = useQuery({
    queryKey: ["cambio-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cambio_cache")
        .select("*")
        .order("capturado_em", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const history = useQuery({
    queryKey: ["cotacao-history", selected],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cotacoes_cache")
        .select("preco, capturado_em")
        .eq("commodity", selected)
        .order("capturado_em", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: new Date(r.capturado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        preco: Number(r.preco),
      }));
    },
  });

  // Latest per commodity
  const latestByCommodity = new Map<string, any>();
  for (const row of cotacoes.data ?? []) {
    if (!latestByCommodity.has(row.commodity)) latestByCommodity.set(row.commodity, row);
  }
  const latestByPar = new Map<string, any>();
  for (const row of cambio.data ?? []) {
    if (!latestByPar.has(row.par)) latestByPar.set(row.par, row);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cotações & Câmbio</h1>
        <p className="text-sm text-muted-foreground">Visão geral do mercado para suas culturas.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Commodities</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {COMMODITIES.map((c) => {
            const row = latestByCommodity.get(c);
            return <QuoteCard key={c} label={c} preco={row?.preco} unidade={row?.unidade} variacao={row?.variacao_pct} />;
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Câmbio</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...latestByPar.values()].length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">Sem dados de câmbio ainda.</p>
          ) : (
            [...latestByPar.values()].map((row) => (
              <QuoteCard key={row.par} label={row.par} preco={row.cotacao} unidade="R$" variacao={row.variacao_pct} />
            ))
          )}
        </div>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Histórico de preços
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{selected}</p>
          </div>
          <Select value={selected} onValueChange={(v) => setSelected(v as Commodity)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMODITIES.map((c) => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-80">
          {history.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há histórico para {selected}.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={["auto", "auto"]} />
                <Tooltip />
                <Line type="monotone" dataKey="preco" stroke="#059669" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuoteCard({ label, preco, unidade, variacao }: { label: string; preco?: number | null; unidade?: string | null; variacao?: number | null }) {
  const v = variacao == null ? null : Number(variacao);
  const Icon = v == null ? Minus : v > 0 ? ArrowUpRight : v < 0 ? ArrowDownRight : Minus;
  const color = v == null ? "text-muted-foreground" : v > 0 ? "text-emerald-600" : v < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground capitalize">{label}</div>
        <div className="mt-1 flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {preco == null ? "—" : Number(preco).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`flex items-center gap-1 text-sm ${color}`}>
            <Icon className="h-4 w-4" />
            {v == null ? "—" : `${v.toFixed(2)}%`}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{unidade ?? ""}</div>
      </CardContent>
    </Card>
  );
}
