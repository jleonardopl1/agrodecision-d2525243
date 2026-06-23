import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

import { supabase } from "@/integrations/supabase/client";

/** Culturas suportadas pela camada (espelha o default 'todas' da RPC). */
export type CulturaVeg = "todas" | "soja" | "milho" | "cafe" | "algodao";

/** Propriedades de cada região no choropleth — ver choropleth_vegetacao (migration 0009). */
export type VegetacaoProps = {
  regiao_id: number;
  codigo_ibge: string;
  nome: string;
  uf: string;
  ndvi: number | null;
  ndvi_anomalia: number | null;
  ndmi: number | null;
  data_fim: string | null;
  cobertura_nuvem: number | null;
};

export type VegetacaoCollection = FeatureCollection<Polygon | MultiPolygon, VegetacaoProps>;

const VAZIO: VegetacaoCollection = { type: "FeatureCollection", features: [] };

/**
 * Última leitura de índices de vegetação por região (GeoJSON), via RPC
 * `choropleth_vegetacao`. Dado COMPARTILHADO (igual para todas as cooperativas);
 * a leitura é liberada para qualquer usuário autenticado pelo RLS.
 */
export function useChoroplethVegetacao(cultura: CulturaVeg = "todas") {
  return useQuery({
    queryKey: ["choropleth-vegetacao", cultura],
    queryFn: async (): Promise<VegetacaoCollection> => {
      // RPC criada na migration 0009 e tipada via `npm run db:types`. Ela
      // retorna Json; convertemos para a coleção GeoJSON tipada da camada.
      const { data, error } = await supabase.rpc("choropleth_vegetacao", {
        p_cultura: cultura,
      });
      if (error) throw new Error(error.message);
      return (data as unknown as VegetacaoCollection) ?? VAZIO;
    },
  });
}
