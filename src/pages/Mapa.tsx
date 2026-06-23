import { useState } from "react";
import { Layers, MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MapaVegetacao, type MetricaVeg } from "@/components/MapaVegetacao";
import { useChoroplethVegetacao, type CulturaVeg } from "@/hooks/use-vegetacao";

const CULTURAS: { valor: CulturaVeg; rotulo: string }[] = [
  { valor: "todas", rotulo: "Todas as culturas" },
  { valor: "soja", rotulo: "Soja" },
  { valor: "milho", rotulo: "Milho" },
  { valor: "cafe", rotulo: "Café" },
  { valor: "algodao", rotulo: "Algodão" },
];

const LEGENDA_ANOMALIA = [
  { cor: "#d73027", txt: "Bem abaixo" },
  { cor: "#fdae61", txt: "Abaixo" },
  { cor: "#ffffbf", txt: "Normal" },
  { cor: "#a6d96a", txt: "Acima" },
  { cor: "#1a9850", txt: "Bem acima" },
];

const LEGENDA_NDVI = [
  { cor: "#a6611a", txt: "Solo" },
  { cor: "#dfc27d", txt: "Baixo" },
  { cor: "#c7eae5", txt: "Médio" },
  { cor: "#5ab4ac", txt: "Bom" },
  { cor: "#01665e", txt: "Vigor" },
];

export default function Mapa() {
  const [cultura, setCultura] = useState<CulturaVeg>("todas");
  const [metrica, setMetrica] = useState<MetricaVeg>("anomalia");
  const { data, isLoading, isError, error } = useChoroplethVegetacao(cultura);

  const semDados = (data?.features.length ?? 0) === 0;
  const legenda = metrica === "ndvi" ? LEGENDA_NDVI : LEGENDA_ANOMALIA;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mapa de vegetação</h1>
        <p className="text-sm text-muted-foreground">
          Índices de satélite (Sentinel-2) por região, como indicador antecedente
          de oferta. Informativo — não é recomendação de compra ou venda.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4" /> Saúde da vegetação por região
            </CardTitle>
            <CardDescription>
              Toque numa região para ver NDVI, anomalia e umidade.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={metrica} onValueChange={(v) => setMetrica(v as MetricaVeg)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anomalia">Anomalia (vs. ano)</SelectItem>
                <SelectItem value="ndvi">NDVI absoluto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={cultura} onValueChange={(v) => setCultura(v as CulturaVeg)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CULTURAS.map((c) => (
                  <SelectItem key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative h-[60vh] min-h-[360px] overflow-hidden rounded-lg border">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : isError ? (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-destructive">
                Não consegui carregar o mapa:{" "}
                {error instanceof Error ? error.message : "erro desconhecido"}
              </div>
            ) : data ? (
              <>
                <MapaVegetacao data={data} metrica={metrica} />
                {semDados ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/70 p-6 text-center">
                    <div className="max-w-sm space-y-1">
                      <p className="text-sm font-medium">Ainda sem dados de vegetação</p>
                      <p className="text-xs text-muted-foreground">
                        Semeie as regiões (<code>regioes_geo</code>) e rode o worker
                        NDVI. Passo a passo em <code>geo/README.md</code>.
                      </p>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Escala:
            </span>
            {legenda.map((l) => (
              <span key={l.cor} className="flex items-center gap-1">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: l.cor }}
                />
                {l.txt}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
