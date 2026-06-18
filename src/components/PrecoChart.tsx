import { useState } from "react";
import { Info } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { COMMODITY_LABEL, COMMODITY_REFERENCIA, type Commodity } from "@/lib/commodities";
import { formatBRL } from "@/lib/format";
import { useHistoricoPrecos, type PeriodoHistorico } from "@/hooks/use-market";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERIODOS: { value: PeriodoHistorico; label: string }[] = [
  { value: "15min", label: "15min" },
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Chave de agregação por período (mantém o último preço de cada bucket). */
function bucketKey(iso: string, periodo: PeriodoHistorico): string {
  const d = new Date(iso);
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  switch (periodo) {
    case "15min":
      return iso; // cada ponto
    case "dia":
      return `${ymd}T${pad(d.getHours())}`; // por hora
    case "ano":
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; // por mês
    default:
      return ymd; // semana, mes -> por dia
  }
}

function fmtEixo(iso: string, periodo: PeriodoHistorico): string {
  const d = new Date(iso);
  if (periodo === "15min" || periodo === "dia")
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (periodo === "ano")
    return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function Metodologia() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          <Info className="h-3.5 w-3.5" /> Metodologia
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Como calculamos o preço de referência</DialogTitle>
          <DialogDescription>De onde vêm os números e com que frequência atualizamos.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Preço físico (à vista):</strong> indicador{" "}
            <strong className="text-foreground">CEPEA/ESALQ</strong> — a média dos negócios reais na
            praça de referência de cada produto, apurada todo dia útil. É o preço que o produtor vê no balcão.
          </p>
          <p>
            <strong className="text-foreground">Futuro:</strong> quando exibido, vem da{" "}
            <strong className="text-foreground">B3</strong> (preço de ajuste do pregão).
          </p>
          <p>
            <strong className="text-foreground">Câmbio:</strong> USD/BRL e EUR/BRL do{" "}
            <strong className="text-foreground">Banco Central</strong>.
          </p>
          <p>
            <strong className="text-foreground">Atualização:</strong> puxamos os dados a cada{" "}
            <strong className="text-foreground">15 minutos</strong>. O preço físico costuma mudar ~1x por
            dia; o futuro se mexe ao longo do pregão.
          </p>
          <p>
            <strong className="text-foreground">Por região:</strong> quando há dado regional, ajustamos
            pela sua praça/UF; senão, mostramos a referência nacional.
          </p>
          <p className="border-t pt-3 text-xs">
            Fontes: CEPEA/ESALQ (cepea.esalq.usp.br) · B3 · Banco Central do Brasil.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Grafico({ commodity, periodo }: { commodity: Commodity; periodo: PeriodoHistorico }) {
  const { data: historico, isLoading } = useHistoricoPrecos(commodity, periodo);

  if (isLoading) return <Skeleton className="h-60 w-full" />;

  if (!historico || historico.length < 2) {
    return (
      <div className="flex h-60 items-center justify-center rounded-md bg-muted/50 px-4 text-center text-sm text-muted-foreground">
        Sem dados suficientes neste período — experimente um intervalo maior.
      </div>
    );
  }

  const porBucket = new Map<string, { capturado_em: string; preco: number }>();
  for (const h of historico) {
    porBucket.set(bucketKey(h.capturado_em, periodo), {
      capturado_em: h.capturado_em,
      preco: Number(h.preco),
    });
  }
  const pontos = [...porBucket.values()].map((h) => ({
    x: fmtEixo(h.capturado_em, periodo),
    preco: h.preco,
  }));
  const unidade = historico[historico.length - 1].unidade;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={pontos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="precoGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="x" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} minTickGap={24} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          formatter={(value) => [`${formatBRL(Number(value))} (${unidade})`, "Preço"]}
          labelClassName="text-xs"
        />
        <Area
          type="monotone"
          dataKey="preco"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#precoGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PrecoChart({ commodities }: { commodities: Commodity[] }) {
  const [ativa, setAtiva] = useState<Commodity>(commodities[0]);
  const [periodo, setPeriodo] = useState<PeriodoHistorico>("mes");
  const selecionada = commodities.includes(ativa) ? ativa : commodities[0];

  if (commodities.length === 0) return null;
  const ref = COMMODITY_REFERENCIA[selecionada];

  return (
    <Card>
      <CardHeader className="space-y-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Histórico de preços</CardTitle>
          <Tabs value={selecionada} onValueChange={(v) => setAtiva(v as Commodity)}>
            <TabsList className="h-8">
              {commodities.map((c) => (
                <TabsTrigger key={c} value={c} className="px-2.5 py-1 text-xs">
                  {COMMODITY_LABEL[c]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              Referência: <span className="font-medium text-foreground">{ref.fonte}</span> · {ref.praca}
            </span>
            <span className="text-border">•</span>
            <Metodologia />
          </div>
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoHistorico)}>
            <TabsList className="h-8">
              {PERIODOS.map((p) => (
                <TabsTrigger key={p.value} value={p.value} className="px-2.5 py-1 text-xs">
                  {p.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <Grafico commodity={selecionada} periodo={periodo} />
      </CardContent>
    </Card>
  );
}
